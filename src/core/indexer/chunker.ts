/**
 * Code-aware chunker (data-plane Tier-1) — zero-dependency.
 *
 * Heuristic per-language: split at function/class/definition boundaries via
 * regex, falling back to an overlapping sliding window. No tree-sitter — Tier-1
 * trades a little precision for zero deps. Captures a symbol name when the
 * definition line exposes one, which feeds BM25 recall on symbol queries.
 */

export interface Chunk {
  id: string;
  path: string;
  startLine: number; // 1-based, inclusive
  endLine: number;   // 1-based, inclusive
  symbol?: string;
  text: string;
}

const MAX_CHUNK_LINES = 120;
const WINDOW_LINES = 60;
const WINDOW_OVERLAP = 10;

// Definition-start patterns per language family. Each entry: regex with an
// optional capture group #1 for the symbol name.
const DEF_PATTERNS: Record<string, RegExp[]> = {
  ts: [
    /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/,
    /^\s*(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)/,
    /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?\(/,
    /^\s*(?:export\s+)?(?:interface|type|enum)\s+([A-Za-z0-9_$]+)/,
    /^\s*(?:public|private|protected|static|async|\s)*([A-Za-z0-9_$]+)\s*\([^)]*\)\s*[:{]/,
  ],
  py: [
    /^\s*def\s+([A-Za-z0-9_]+)/,
    /^\s*class\s+([A-Za-z0-9_]+)/,
    /^\s*async\s+def\s+([A-Za-z0-9_]+)/,
  ],
  go: [
    /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z0-9_]+)/,
    /^\s*type\s+([A-Za-z0-9_]+)\s+(?:struct|interface)/,
  ],
  rust: [
    /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)/,
    /^\s*(?:pub\s+)?(?:struct|enum|trait|impl)\s+([A-Za-z0-9_]+)/,
  ],
  java: [
    /^\s*(?:public|private|protected|static|final|abstract|\s)*(?:class|interface|enum)\s+([A-Za-z0-9_]+)/,
    /^\s*(?:public|private|protected|static|final|\s)+[A-Za-z0-9_<>[\]]+\s+([A-Za-z0-9_]+)\s*\(/,
  ],
};

const EXT_FAMILY: Record<string, keyof typeof DEF_PATTERNS> = {
  ts: "ts", tsx: "ts", js: "ts", jsx: "ts", mjs: "ts", cjs: "ts",
  py: "py", pyi: "py",
  go: "go",
  rs: "rust",
  java: "java", kt: "java", cs: "java", scala: "java",
};

function familyForExt(ext: string): keyof typeof DEF_PATTERNS | null {
  return EXT_FAMILY[ext] ?? null;
}

function matchDef(line: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = re.exec(line);
    if (m) return m[1] ?? "";
  }
  return null;
}

function makeChunk(path: string, lines: string[], start: number, end: number, symbol?: string): Chunk {
  // start/end are 0-based indices here; emit 1-based.
  return {
    id: `${path}:${start + 1}`,
    path,
    startLine: start + 1,
    endLine: end + 1,
    symbol: symbol || undefined,
    text: lines.slice(start, end + 1).join("\n"),
  };
}

function windowSplit(path: string, lines: string[], from: number, to: number, symbol?: string): Chunk[] {
  const out: Chunk[] = [];
  if (to - from + 1 <= MAX_CHUNK_LINES) {
    out.push(makeChunk(path, lines, from, to, symbol));
    return out;
  }
  let s = from;
  while (s <= to) {
    const e = Math.min(s + WINDOW_LINES - 1, to);
    out.push(makeChunk(path, lines, s, e, s === from ? symbol : undefined));
    if (e === to) break;
    s = e - WINDOW_OVERLAP + 1;
  }
  return out;
}

export function chunkFile(relPath: string, content: string): Chunk[] {
  const ext = relPath.split(".").pop()?.toLowerCase() ?? "";
  const lines = content.split("\n");
  if (lines.length === 0) return [];

  const family = familyForExt(ext);
  const patterns = family ? DEF_PATTERNS[family] : null;

  if (!patterns) {
    // Unknown language → pure overlapping sliding window over whole file.
    return windowSplit(relPath, lines, 0, lines.length - 1);
  }

  // Collect definition-start line indices and their symbols.
  const defs: Array<{ line: number; symbol: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const sym = matchDef(lines[i], patterns);
    if (sym !== null) defs.push({ line: i, symbol: sym });
  }

  if (defs.length === 0) {
    return windowSplit(relPath, lines, 0, lines.length - 1);
  }

  const chunks: Chunk[] = [];
  // Leading region before the first definition (imports, file header).
  if (defs[0].line > 0) {
    chunks.push(...windowSplit(relPath, lines, 0, defs[0].line - 1));
  }
  for (let d = 0; d < defs.length; d++) {
    const start = defs[d].line;
    const end = d + 1 < defs.length ? defs[d + 1].line - 1 : lines.length - 1;
    chunks.push(...windowSplit(relPath, lines, start, end, defs[d].symbol));
  }
  return chunks.filter(c => c.text.trim().length > 0);
}
