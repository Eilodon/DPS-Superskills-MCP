import { afterEach, describe, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BM25Index, tokenize } from "../core/indexer/bm25.js";
import { chunkFile } from "../core/indexer/chunker.js";
import { walk } from "../core/indexer/walker.js";
import { saveIndex, loadIndex, loadMeta, clearIndex, indexDir } from "../core/indexer/store.js";
import { buildIndex, searchIndex, indexStatus, resetIndex } from "../core/indexer/index.js";

const tmpDirs: string[] = [];
function tmpRepo(): string {
  const d = mkdtempSync(join(tmpdir(), "idx-test-"));
  tmpDirs.push(d);
  return d;
}
function write(root: string, rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}
afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

// ── tokenize / stemming ──────────────────────────────────────────────────────
describe("tokenize", () => {
  test("splits identifiers into subtokens and keeps whole token", () => {
    const t = tokenize("validateUser");
    expect(t).toContain("validate");
    expect(t).toContain("user");
  });

  test("handles snake_case", () => {
    const t = tokenize("rate_limit_window");
    expect(t).toEqual(expect.arrayContaining(["rate", "limit", "window"]));
  });

  test("light stemming collapses plural/-ing to a shared stem", () => {
    expect(tokenize("limits")).toContain("limit");
    expect(tokenize("limiting")).toContain("limit");
  });

  test("drops stopwords and 1-char noise", () => {
    const t = tokenize("the a b");
    expect(t).not.toContain("the");
  });
});

// ── BM25 ─────────────────────────────────────────────────────────────────────
describe("BM25Index", () => {
  test("ranks a doc with more query-term matches higher", () => {
    const idx = new BM25Index();
    idx.addDocument("d1", tokenize("rate limiter enforces request quota per tenant"));
    idx.addDocument("d2", tokenize("unrelated logging utility for telemetry"));
    const hits = idx.search("rate limiter quota", 5);
    expect(hits[0].id).toBe("d1");
  });

  test("stemmed query matches stemmed document term", () => {
    const idx = new BM25Index();
    idx.addDocument("d1", tokenize("the service limits inbound requests"));
    const hits = idx.search("limiting", 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe("d1");
  });

  test("serialize/deserialize roundtrip preserves search results", () => {
    const idx = new BM25Index();
    idx.addDocument("a", tokenize("alpha beta gamma"));
    idx.addDocument("b", tokenize("beta delta"));
    const restored = BM25Index.deserialize(idx.serialize());
    expect(restored.size).toBe(idx.size);
    expect(restored.search("beta delta", 5)).toEqual(idx.search("beta delta", 5));
  });

  test("empty index returns no hits", () => {
    expect(new BM25Index().search("anything")).toEqual([]);
  });
});

// ── chunker ──────────────────────────────────────────────────────────────────
describe("chunkFile", () => {
  test("captures function symbols for a known language", () => {
    const src = "export function foo() {\n  return 1;\n}\n\nexport function bar() {\n  return 2;\n}\n";
    const chunks = chunkFile("src/x.ts", src);
    const symbols = chunks.map(c => c.symbol).filter(Boolean);
    expect(symbols).toEqual(expect.arrayContaining(["foo", "bar"]));
  });

  test("emits 1-based line ranges and stable ids", () => {
    const chunks = chunkFile("a.ts", "function a(){}\nfunction b(){}\n");
    expect(chunks[0].startLine).toBeGreaterThanOrEqual(1);
    expect(chunks[0].id).toContain("a.ts:");
  });

  test("falls back to sliding window for unknown extensions", () => {
    const text = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");
    const chunks = chunkFile("notes.unknownext", text);
    expect(chunks.length).toBeGreaterThan(1); // split into windows
    expect(chunks.every(c => c.symbol === undefined)).toBe(true);
  });
});

// ── walker ───────────────────────────────────────────────────────────────────
describe("walk", () => {
  test("respects denylist, extension allowlist and .gitignore", async () => {
    const root = tmpRepo();
    write(root, "src/keep.ts", "export const a = 1;");
    write(root, "src/skip.png", "binary");
    write(root, "node_modules/dep/index.ts", "export const x = 1;");
    write(root, "src/ignored.ts", "export const y = 1;");
    write(root, ".gitignore", "ignored.ts\n");

    const files = (await walk(root)).map(f => f.relPath);
    expect(files).toContain("src/keep.ts");
    expect(files).not.toContain("src/skip.png");          // extension not allowed
    expect(files.some(f => f.includes("node_modules"))).toBe(false); // denylist
    expect(files).not.toContain("src/ignored.ts");        // gitignore
  });

  test("indexes .dps/spec and .dps/agent but never .dps/index or lock files", async () => {
    const root = tmpRepo();
    write(root, ".dps/spec/CONTRACTS.md", "# Contracts\nPaymentIntent schema");
    write(root, ".dps/agent/CONTEXT.md", "# Context");
    write(root, ".dps/index/postings.json", "{}");
    write(root, ".dps/DPS_LOCK.yml", "lock: true");
    write(root, "src/a.ts", "export const a = 1;");
    const files = (await walk(root)).map(f => f.relPath);
    expect(files).toEqual(expect.arrayContaining([".dps/spec/CONTRACTS.md", ".dps/agent/CONTEXT.md", "src/a.ts"]));
    expect(files).not.toContain(".dps/index/postings.json");
    expect(files).not.toContain(".dps/DPS_LOCK.yml");
  });
});

// ── store ────────────────────────────────────────────────────────────────────
describe("store", () => {
  test("saveIndex → loadIndex roundtrip and loadMeta is partial", async () => {
    const root = tmpRepo();
    const persisted = {
      manifest: { version: 1 as const, builtAt: "now", rootHash: "r", fileCount: 1, chunkCount: 1 },
      files: [{ relPath: "a.ts", size: 1, mtimeMs: 1, sha256: "h" }],
      chunksByFile: { "a.ts": [{ id: "a.ts:1", path: "a.ts", startLine: 1, endLine: 1, text: "x" }] },
      bm25: { version: 2, ids: [], docLen: [], postings: {} },
    };
    await saveIndex(root, persisted);
    const back = await loadIndex(root);
    expect(back?.manifest.rootHash).toBe("r");
    expect(back?.chunksByFile["a.ts"][0].id).toBe("a.ts:1");

    const meta = await loadMeta(root);
    expect(meta?.manifest.fileCount).toBe(1);
    expect(meta?.files[0].relPath).toBe("a.ts");

    expect(existsSync(indexDir(root))).toBe(true);
    await clearIndex(root);
    expect(existsSync(indexDir(root))).toBe(false);
  });

  test("loadIndex/loadMeta return null when absent", async () => {
    const root = tmpRepo();
    expect(await loadIndex(root)).toBeNull();
    expect(await loadMeta(root)).toBeNull();
  });
});

// ── orchestrator: build / incremental / search ───────────────────────────────
describe("buildIndex + searchIndex", () => {
  test("builds an index and short-circuits on a no-op refresh", async () => {
    const root = tmpRepo();
    write(root, "src/a.ts", "export function alpha() { return 1; }");
    const first = await buildIndex(root);
    expect(first.fileCount).toBe(1);
    expect(first.reindexed).toBe(1);
    expect(first.noop).toBeFalsy();

    const second = await buildIndex(root);
    expect(second.noop).toBe(true);
    expect(second.reindexed).toBe(0);
    await resetIndex(root);
  });

  test("re-indexes only changed files incrementally", async () => {
    const root = tmpRepo();
    write(root, "src/a.ts", "export function alpha() {}");
    write(root, "src/b.ts", "export function beta() {}");
    await buildIndex(root);
    // touch one file with new content + later mtime
    await new Promise(r => setTimeout(r, 10));
    write(root, "src/a.ts", "export function alphaChanged() { return 42; }");
    const stats = await buildIndex(root);
    expect(stats.reindexed).toBe(1);
    expect(stats.reused).toBe(1);
    await resetIndex(root);
  });

  test("rerank: a symbol/path match outranks a mere comment mention (prose down-weight)", async () => {
    const root = tmpRepo();
    // Real implementation: symbol + path carry the term.
    write(root, "src/auth/validate_user.ts", "export function validateUser() {\n  return checkPassword();\n}\n");
    // Decoy: the term only appears inside a comment / string.
    write(root, "src/misc/notes.ts", "// validateUser validateUser validateUser is great\nexport function helper() { return 'validateUser'; }\n");
    await buildIndex(root);
    const res = await searchIndex(root, "validateUser", 5);
    expect(res).not.toBeNull();
    expect(res!.hits[0].path).toBe("src/auth/validate_user.ts");
    await resetIndex(root);
  });

  test("searchIndex returns null without an index", async () => {
    const root = tmpRepo();
    expect(await searchIndex(root, "x")).toBeNull();
  });

  test("file-diversity cap stops one file flooding the top-k", async () => {
    const root = tmpRepo();
    const many = Array.from({ length: 6 }, (_, i) =>
      `export function widgetHandler${i}() { return processWidget(); }`).join("\n\n");
    write(root, "src/big.ts", many);
    write(root, "src/small.ts", "export function widgetSolo() { return processWidget(); }");
    await buildIndex(root);
    const res = await searchIndex(root, "widget processWidget", 8);
    const fromBig = res!.hits.filter(h => h.path === "src/big.ts").length;
    expect(fromBig).toBeLessThanOrEqual(2);
    await resetIndex(root);
  });

  test("centered preview points at the matching region, not the chunk head", async () => {
    const root = tmpRepo();
    const filler = Array.from({ length: 20 }, (_, i) => `  const filler${i} = ${i};`).join("\n");
    write(root, "src/deep.ts", `export function deepFn() {\n${filler}\n  const needleToken = computeNeedle();\n  return needleToken;\n}\n`);
    await buildIndex(root);
    const res = await searchIndex(root, "needleToken", 3);
    const hit = res!.hits[0];
    expect(hit.path).toBe("src/deep.ts");
    expect(hit.preview).toContain("needleToken");
    expect(hit.startLine).toBeGreaterThan(5); // centred near the match, not line 1
    await resetIndex(root);
  });

  test("fuses DPS spec into results and tags source=spec", async () => {
    const root = tmpRepo();
    write(root, ".dps/spec/CONTRACTS.md", "# CONTRACTS\n\nThe PaymentIntent schema defines amount, currency and customerId.\n");
    write(root, "src/unrelated.ts", "export function helper() { return 1; }");
    await buildIndex(root);
    const res = await searchIndex(root, "PaymentIntent schema", 5);
    expect(res).not.toBeNull();
    expect(res!.hits[0].source).toBe("spec");
    expect(res!.hits[0].path).toBe(".dps/spec/CONTRACTS.md");
    await resetIndex(root);
  });

  test("indexStatus reports staleness after a new file appears", async () => {
    const root = tmpRepo();
    write(root, "src/a.ts", "export const a = 1;");
    await buildIndex(root);
    expect((await indexStatus(root)).stale).toBe(false);
    write(root, "src/b.ts", "export const b = 2;");
    const status = await indexStatus(root);
    expect(status.stale).toBe(true);
    expect(status.added).toBe(1);
    await resetIndex(root);
  });
});
