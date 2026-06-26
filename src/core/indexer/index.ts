/**
 * Indexer orchestrator (data-plane Tier-1).
 *
 * Resolves the workspace root, builds/refreshes the local BM25 index over the
 * user's source, and answers searches. Incremental: unchanged files (matched by
 * size+mtime) reuse their previous chunks; a no-op refresh short-circuits after
 * a cheap meta load + walk, without rebuilding or re-saving the index.
 *
 * Relevance (Tier-1, still embedding-free):
 *  - prose down-weighting: comments + string literals are indexed once, while
 *    real code identifiers keep their natural term frequency, so doc/comment
 *    text stops outranking implementations.
 *  - multi-signal rerank over an over-fetched candidate set: symbol-match,
 *    path-match, definition boost, and a test/fixture penalty.
 *
 * Data/control plane boundary: indexing needs a local filesystem workspace.
 * Under HTTP transport with no MCP_WORKSPACE_ROOT, resolveWorkspaceRoot returns
 * null and the tools refuse — the indexer is a local (stdio) data-plane feature.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { ENV } from "../../config/env.js";
import { BM25Index, tokenize } from "./bm25.js";
import { chunkFile, type Chunk } from "./chunker.js";
import { walk, type WalkedFile } from "./walker.js";
import {
  loadIndex, loadMeta, saveIndex, clearIndex,
  type FileRecord, type PersistedIndex, type IndexManifest,
} from "./store.js";

const SYMBOL_BOOST = 3;
const PATH_BOOST = 2;

export function resolveWorkspaceRoot(): string | null {
  if (ENV.MCP_WORKSPACE_ROOT && ENV.MCP_WORKSPACE_ROOT.trim()) {
    return ENV.MCP_WORKSPACE_ROOT.trim();
  }
  if (ENV.TRANSPORT_DRIVER === "stdio") return process.cwd();
  return null;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function rootHashOf(files: FileRecord[]): string {
  const h = createHash("sha256");
  for (const f of [...files].sort((a, b) => a.relPath.localeCompare(b.relPath))) {
    h.update(`${f.relPath}:${f.sha256}\n`);
  }
  return h.digest("hex").slice(0, 32);
}

// ── Prose down-weighting ─────────────────────────────────────────────────────
// Languages whose textual content IS the payload — index them verbatim.
const VERBATIM_EXT = new Set(["md", "mdx", "txt", "json"]);
// Languages using '#' line comments (NOT C-family, where '#' can be a private field).
const HASH_EXT = new Set(["py", "pyi", "sh", "bash", "yaml", "yml", "toml", "rb"]);

function extOf(path: string): string {
  return path.split(".").pop()?.toLowerCase() ?? "";
}

/** Separate real code from comments + string literals. Returns code (kept at
 * natural term frequency) and prose (folded in once, so it stays searchable but
 * cannot dominate ranking). */
function splitCodeProse(text: string, ext: string): { code: string; prose: string } {
  if (VERBATIM_EXT.has(ext) || (!HASH_EXT.has(ext) && ext === "")) {
    return { code: text, prose: "" };
  }
  const prose: string[] = [];
  let code = text;
  const grab = (m: string): string => { prose.push(m); return " "; };
  // Block comments /* ... */
  code = code.replace(/\/\*[\s\S]*?\*\//g, grab);
  // C-style line comments //
  code = code.replace(/\/\/[^\n]*/g, grab);
  // Hash comments for hash languages only
  if (HASH_EXT.has(ext)) code = code.replace(/#[^\n]*/g, grab);
  // String / template literals
  code = code.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, grab);
  return { code, prose: prose.join(" ") };
}

function tokensForChunk(chunk: Chunk): string[] {
  const ext = extOf(chunk.path);
  const { code, prose } = splitCodeProse(chunk.text, ext);
  const tokens: string[] = tokenize(code);
  // Prose folded in once (dedup) — low marginal tf.
  for (const t of new Set(tokenize(prose))) tokens.push(t);
  // Symbol and path fields, boosted.
  if (chunk.symbol) {
    const sym = tokenize(chunk.symbol);
    for (let i = 0; i < SYMBOL_BOOST; i++) tokens.push(...sym);
  }
  const pathToks = tokenize(chunk.path.replace(/[/.]/g, " "));
  for (let i = 0; i < PATH_BOOST; i++) tokens.push(...pathToks);
  return tokens;
}

function buildBM25(chunksByFile: Record<string, Chunk[]>): BM25Index {
  const idx = new BM25Index();
  for (const chunks of Object.values(chunksByFile)) {
    for (const c of chunks) idx.addDocument(c.id, tokensForChunk(c));
  }
  return idx;
}

const READ_CONCURRENCY = 16;

/** Run an async fn over items with a bounded number of in-flight calls — used to
 * overlap file-read IO during a cold build without unbounded fd pressure. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

// ── Build / incremental refresh ──────────────────────────────────────────────

interface Diff { added: number; modified: number; removed: number; }

function diffFiles(prev: FileRecord[], walked: WalkedFile[]): Diff {
  const prevByPath = new Map(prev.map(f => [f.relPath, f]));
  const seen = new Set<string>();
  let added = 0, modified = 0;
  for (const wf of walked) {
    seen.add(wf.relPath);
    const old = prevByPath.get(wf.relPath);
    if (!old) { added++; continue; }
    if (old.size !== wf.size || old.mtimeMs !== wf.mtimeMs) modified++;
  }
  let removed = 0;
  for (const f of prev) if (!seen.has(f.relPath)) removed++;
  return { added, modified, removed };
}

export interface BuildStats {
  fileCount: number;
  chunkCount: number;
  reused: number;
  reindexed: number;
  durationMs: number;
  rootHash: string;
  noop?: boolean;
}

export async function buildIndex(workspaceRoot: string, opts: { force?: boolean } = {}): Promise<BuildStats> {
  const started = Date.now();
  const walked = await walk(workspaceRoot);

  // No-op fast path: cheap meta load (no postings), short-circuit if unchanged.
  if (!opts.force) {
    const meta = await loadMeta(workspaceRoot);
    if (meta) {
      const d = diffFiles(meta.files, walked);
      if (d.added + d.modified + d.removed === 0) {
        return {
          fileCount: meta.manifest.fileCount,
          chunkCount: meta.manifest.chunkCount,
          reused: meta.manifest.fileCount,
          reindexed: 0,
          durationMs: Date.now() - started,
          rootHash: meta.manifest.rootHash,
          noop: true,
        };
      }
    }
  }

  const prev = opts.force ? null : await loadIndex(workspaceRoot);
  const prevByPath = new Map<string, FileRecord>((prev?.files ?? []).map(f => [f.relPath, f]));

  const files: FileRecord[] = [];
  const chunksByFile: Record<string, Chunk[]> = {};
  let reused = 0;
  let reindexed = 0;

  // Partition into reused (unchanged) vs to-read, then read the latter with
  // bounded concurrency so cold-build IO overlaps instead of running serially.
  const toRead: WalkedFile[] = [];
  for (const wf of walked) {
    const old = prevByPath.get(wf.relPath);
    if (old && old.size === wf.size && old.mtimeMs === wf.mtimeMs && prev?.chunksByFile[wf.relPath]) {
      files.push(old);
      chunksByFile[wf.relPath] = prev.chunksByFile[wf.relPath];
      reused++;
    } else {
      toRead.push(wf);
    }
  }

  const loadedFiles = await mapWithConcurrency(toRead, READ_CONCURRENCY, async wf => {
    try {
      return { wf, content: await readFile(wf.absPath, "utf8") };
    } catch {
      return null;
    }
  });
  for (const entry of loadedFiles) {
    if (!entry) continue;
    const { wf, content } = entry;
    files.push({ relPath: wf.relPath, size: wf.size, mtimeMs: wf.mtimeMs, sha256: sha256(content) });
    chunksByFile[wf.relPath] = chunkFile(wf.relPath, content);
    reindexed++;
  }

  const bm25 = buildBM25(chunksByFile);
  const chunkCount = Object.values(chunksByFile).reduce((n, c) => n + c.length, 0);
  const rootHash = rootHashOf(files);
  const manifest: IndexManifest = {
    version: 1,
    builtAt: new Date().toISOString(),
    rootHash,
    fileCount: files.length,
    chunkCount,
  };
  const persisted: PersistedIndex = { manifest, files, chunksByFile, bm25: bm25.serialize() };
  await saveIndex(workspaceRoot, persisted);

  return { fileCount: files.length, chunkCount, reused, reindexed, durationMs: Date.now() - started, rootHash };
}

// ── Search (with in-memory cache keyed by rootHash) ──────────────────────────

interface LoadedIndex {
  bm25: BM25Index;
  chunkById: Map<string, Chunk>;
  manifest: IndexManifest;
}
const cache = new Map<string, LoadedIndex>();

function hydrate(persisted: PersistedIndex): LoadedIndex {
  const chunkById = new Map<string, Chunk>();
  for (const chunks of Object.values(persisted.chunksByFile)) {
    for (const c of chunks) chunkById.set(c.id, c);
  }
  return {
    bm25: BM25Index.deserialize(persisted.bm25 as Parameters<typeof BM25Index.deserialize>[0]),
    chunkById,
    manifest: persisted.manifest,
  };
}

const TEST_PATH = /(^|\/)(tests?|__tests__|spec|fixtures?)(\/|\.)|\.(test|spec)\./i;
const TEST_QUERY_TERMS = new Set(["test", "tests", "spec", "fixture", "fixtures", "mock", "stub"]);
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*|#|<!--)/;

function fractionMatched(queryTokens: Set<string>, fieldTokens: Set<string>): number {
  if (queryTokens.size === 0) return 0;
  let hit = 0;
  for (const q of queryTokens) if (fieldTokens.has(q)) hit++;
  return hit / queryTokens.size;
}

function commentDensity(text: string): number {
  const lines = text.split("\n").filter(l => l.trim().length > 0);
  if (lines.length === 0) return 0;
  let c = 0;
  for (const l of lines) if (COMMENT_LINE.test(l)) c++;
  return c / lines.length;
}

const MAX_PER_FILE = 2;
const SPEC_BOOST = 1.4; // DPS living-spec chunks (.dps/spec/) are high-signal context
const PREVIEW_LINES = 14;
const PREVIEW_MAX_CHARS = 700;
const PROX_WINDOW = 30;

function clipPreview(s: string): string {
  return s.length > PREVIEW_MAX_CHARS ? `${s.slice(0, PREVIEW_MAX_CHARS)}…` : s;
}

/** Slice of a chunk centred on the line with the most query-term matches, with
 * absolute line numbers — fewer tokens than the chunk head and points the agent
 * at the actual match. Falls back to the chunk head when nothing matches. */
function centeredPreview(
  text: string,
  chunkStart: number,
  q: Set<string>,
): { preview: string; startLine: number; endLine: number } {
  const lines = text.split("\n");
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < lines.length; i++) {
    const lt = new Set(tokenize(lines[i]));
    let s = 0;
    for (const t of q) if (lt.has(t)) s++;
    if (s > bestScore) { bestScore = s; bestIdx = i; }
  }
  let start: number;
  if (bestIdx < 0) {
    start = 0;
  } else {
    start = Math.max(0, bestIdx - Math.floor(PREVIEW_LINES / 2));
  }
  const end = Math.min(lines.length - 1, start + PREVIEW_LINES - 1);
  start = Math.max(0, end - PREVIEW_LINES + 1);
  return {
    preview: clipPreview(lines.slice(start, end + 1).join("\n")),
    startLine: chunkStart + start,
    endLine: chunkStart + end,
  };
}

/** Proximity bonus in [0,1]: rewards chunks where distinct query terms cluster
 * within a small token window (phrase-like matches). */
function proximity(tokens: string[], q: Set<string>): number {
  if (q.size < 2) return 0;
  const pos: number[] = [];
  const term: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (q.has(tokens[i])) { pos.push(i); term.push(tokens[i]); }
  }
  const totalDistinct = new Set(term).size;
  if (totalDistinct < 2) return 0;
  let best = 1;
  for (let i = 0; i < pos.length; i++) {
    const seen = new Set<string>();
    for (let j = i; j < pos.length && pos[j] - pos[i] <= PROX_WINDOW; j++) seen.add(term[j]);
    if (seen.size > best) best = seen.size;
  }
  return (best - 1) / (totalDistinct - 1);
}

export interface SearchHit {
  path: string;
  startLine: number;
  endLine: number;
  symbol?: string;
  source: "spec" | "code";
  score: number;
  preview: string;
}

const SPEC_PREFIX = ".dps/spec/";

export async function searchIndex(
  workspaceRoot: string,
  query: string,
  topK = 8,
): Promise<{ hits: SearchHit[]; manifest: IndexManifest } | null> {
  const persisted = await loadIndex(workspaceRoot);
  if (!persisted) return null;
  let loaded = cache.get(persisted.manifest.rootHash);
  if (!loaded) {
    loaded = hydrate(persisted);
    cache.set(persisted.manifest.rootHash, loaded);
  }

  const queryTokens = new Set(tokenize(query));
  const queryIsTest = [...queryTokens].some(t => TEST_QUERY_TERMS.has(t));

  // Over-fetch candidates, then rerank with metadata + proximity signals.
  const candidates = loaded.bm25.search(query, Math.max(topK * 6, 40));
  const reranked: SearchHit[] = [];
  for (const cand of candidates) {
    const c = loaded.chunkById.get(cand.id);
    if (!c) continue;
    const symTokens = new Set(c.symbol ? tokenize(c.symbol) : []);
    const pathTokens = new Set(tokenize(c.path.replace(/[/.]/g, " ")));
    const symFrac = fractionMatched(queryTokens, symTokens);
    const pathFrac = fractionMatched(queryTokens, pathTokens);

    const isSpec = c.path.startsWith(SPEC_PREFIX);
    let score = cand.score;
    score *= 1 + 1.6 * symFrac;            // query terms hitting a symbol name
    score *= 1 + 0.9 * pathFrac;           // query terms hitting the path
    score *= 1 + 0.5 * proximity(tokenize(c.text), queryTokens); // phrase-like clustering
    if (c.symbol) score *= 1.12;           // definitions over loose fragments
    if (isSpec) score *= SPEC_BOOST;       // DPS living spec ranks above raw code
    if (TEST_PATH.test(c.path) && !queryIsTest) score *= 0.5; // test/fixture noise
    if (!VERBATIM_EXT.has(extOf(c.path))) score *= 1 - 0.25 * commentDensity(c.text); // skip for md/spec

    const win = centeredPreview(c.text, c.startLine, queryTokens);
    reranked.push({
      path: c.path, startLine: win.startLine, endLine: win.endLine, symbol: c.symbol,
      source: isSpec ? "spec" : "code",
      score: Number(score.toFixed(4)), preview: win.preview,
    });
  }
  reranked.sort((a, b) => b.score - a.score);

  // File-diversity cap: stop any one file from flooding the top-k.
  const perFile = new Map<string, number>();
  const hits: SearchHit[] = [];
  for (const h of reranked) {
    const seen = perFile.get(h.path) ?? 0;
    if (seen >= MAX_PER_FILE) continue;
    perFile.set(h.path, seen + 1);
    hits.push(h);
    if (hits.length >= topK) break;
  }
  return { hits, manifest: loaded.manifest };
}

export interface IndexStatus {
  exists: boolean;
  manifest?: IndexManifest;
  stale?: boolean;
  added?: number;
  removed?: number;
  modified?: number;
}

export async function indexStatus(workspaceRoot: string): Promise<IndexStatus> {
  const meta = await loadMeta(workspaceRoot);
  if (!meta) return { exists: false };
  const walked = await walk(workspaceRoot);
  const d = diffFiles(meta.files, walked);
  return {
    exists: true,
    manifest: meta.manifest,
    stale: d.added + d.modified + d.removed > 0,
    added: d.added, removed: d.removed, modified: d.modified,
  };
}

export async function resetIndex(workspaceRoot: string): Promise<void> {
  cache.clear();
  await clearIndex(workspaceRoot);
}

export { join };
