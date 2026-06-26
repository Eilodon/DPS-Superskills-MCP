/**
 * Index persistence (data-plane Tier-1) — atomic writes into <workspace>/.dps/.
 *
 * Mirrors LocalFSStore's tmp-write+rename discipline. The index/ dir is a
 * regenerable cache (gitignored); spec/ is reserved for DPS living files and is
 * left untouched here.
 */
import { mkdir, readFile, rename, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { Chunk } from "./chunker.js";

export interface FileRecord {
  relPath: string;
  size: number;
  mtimeMs: number;
  sha256: string;
}

export interface IndexManifest {
  version: 1;
  builtAt: string;
  rootHash: string;
  fileCount: number;
  chunkCount: number;
}

export interface PersistedIndex {
  manifest: IndexManifest;
  files: FileRecord[];
  chunksByFile: Record<string, Chunk[]>;
  bm25: unknown;
}

export function dpsDir(workspaceRoot: string): string {
  return join(workspaceRoot, ".dps");
}

export function indexDir(workspaceRoot: string): string {
  return join(dpsDir(workspaceRoot), "index");
}

async function atomicWrite(path: string, data: string): Promise<void> {
  const tmp = `${path}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(tmp, data, { mode: 0o600 });
  await rename(tmp, path);
}

async function ensureGitignore(workspaceRoot: string): Promise<void> {
  const gi = join(dpsDir(workspaceRoot), ".gitignore");
  try {
    await readFile(gi, "utf8");
  } catch {
    // index/ is a regenerable cache; spec/ is tracked living knowledge.
    await atomicWrite(gi, "index/\n*.tmp\n");
  }
}

export async function saveIndex(workspaceRoot: string, idx: PersistedIndex): Promise<void> {
  const dir = indexDir(workspaceRoot);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await ensureGitignore(workspaceRoot);
  await atomicWrite(join(dir, "manifest.json"), JSON.stringify(idx.manifest, null, 2));
  await atomicWrite(join(dir, "files.json"), JSON.stringify(idx.files));
  await atomicWrite(join(dir, "chunks.json"), JSON.stringify(idx.chunksByFile));
  await atomicWrite(join(dir, "postings.json"), JSON.stringify(idx.bm25));
}

export async function loadIndex(workspaceRoot: string): Promise<PersistedIndex | null> {
  const dir = indexDir(workspaceRoot);
  try {
    const [m, f, c, b] = await Promise.all([
      readFile(join(dir, "manifest.json"), "utf8"),
      readFile(join(dir, "files.json"), "utf8"),
      readFile(join(dir, "chunks.json"), "utf8"),
      readFile(join(dir, "postings.json"), "utf8"),
    ]);
    return {
      manifest: JSON.parse(m) as IndexManifest,
      files: JSON.parse(f) as FileRecord[],
      chunksByFile: JSON.parse(c) as Record<string, Chunk[]>,
      bm25: JSON.parse(b) as unknown,
    };
  } catch {
    return null;
  }
}

/** Lightweight load of just manifest + file records (no postings/chunks) for
 * the no-op fast path — avoids parsing the multi-MB postings file when nothing
 * has changed. */
export async function loadMeta(
  workspaceRoot: string,
): Promise<{ manifest: IndexManifest; files: FileRecord[] } | null> {
  const dir = indexDir(workspaceRoot);
  try {
    const [m, f] = await Promise.all([
      readFile(join(dir, "manifest.json"), "utf8"),
      readFile(join(dir, "files.json"), "utf8"),
    ]);
    return { manifest: JSON.parse(m) as IndexManifest, files: JSON.parse(f) as FileRecord[] };
  } catch {
    return null;
  }
}

export async function clearIndex(workspaceRoot: string): Promise<void> {
  await rm(indexDir(workspaceRoot), { recursive: true, force: true });
}
