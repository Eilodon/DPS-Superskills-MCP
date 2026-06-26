/**
 * Filesystem walker (data-plane Tier-1) — zero-dependency.
 *
 * Walks a workspace root, honouring a built-in denylist plus a pragmatic subset
 * of .gitignore semantics. Skips oversized files. Reads only source-like text
 * files (extension allowlist) to keep the index code-focused and binary-free.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const MAX_FILE_BYTES = 512 * 1024;
const GLOBSTAR = "__GLOBSTAR__";

const DIR_DENYLIST = new Set([
  ".git", "node_modules", "dist", "build", "out", "coverage",
  ".next", ".turbo", ".cache", "vendor", "__pycache__", ".venv", "venv",
  "target", ".idea", ".vscode", ".gradle",
]);

// Inside a user repo's .dps/, only spec/ and agent/ are indexable living
// knowledge; the index/ cache and DPS_LOCK.yml are excluded (the index must not
// index itself, and the lock is machine state).
function dpsExcluded(relNorm: string): boolean {
  if (relNorm !== ".dps" && !relNorm.startsWith(".dps/")) return false;
  if (relNorm === ".dps") return false; // allow descending to reach spec/agent
  return !(
    relNorm === ".dps/spec" || relNorm.startsWith(".dps/spec/") ||
    relNorm === ".dps/agent" || relNorm.startsWith(".dps/agent/")
  );
}

const EXT_ALLOWLIST = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "pyi", "go", "rs", "java", "kt", "cs", "scala",
  "rb", "php", "c", "h", "cpp", "hpp", "cc", "zig",
  "sh", "bash", "sql", "json", "yaml", "yml", "toml",
  "md", "mdx", "txt",
]);

export interface WalkedFile {
  relPath: string;
  absPath: string;
  size: number;
  mtimeMs: number;
}

interface GitignoreMatcher {
  ignored: (relPath: string, isDir: boolean) => boolean;
}

function compileGitignore(lines: string[]): GitignoreMatcher {
  const rules: Array<{ re: RegExp; dirOnly: boolean; negate: boolean }> = [];
  for (let raw of lines) {
    raw = raw.trim();
    if (!raw || raw.startsWith("#")) continue;
    let negate = false;
    if (raw.startsWith("!")) { negate = true; raw = raw.slice(1); }
    const dirOnly = raw.endsWith("/");
    if (dirOnly) raw = raw.slice(0, -1);
    const anchored = raw.startsWith("/");
    if (anchored) raw = raw.slice(1);
    // Translate a gitignore glob to a regex (subset: ** * ? + literal segments).
    const escaped = raw
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, GLOBSTAR)
      .replace(/\*/g, "[^/]*")
      .replace(new RegExp(GLOBSTAR, "g"), ".*")
      .replace(/\?/g, "[^/]");
    const prefix = anchored ? "^" : "(^|/)";
    // eslint-disable-next-line security/detect-non-literal-regexp
    rules.push({ re: new RegExp(`${prefix}${escaped}(/|$)`), dirOnly, negate });
  }
  return {
    ignored(relPath, isDir) {
      const probe = relPath.split(sep).join("/");
      let ignored = false;
      for (const r of rules) {
        if (r.dirOnly && !isDir) continue;
        if (r.re.test(probe)) ignored = !r.negate;
      }
      return ignored;
    },
  };
}

async function loadGitignore(root: string): Promise<GitignoreMatcher> {
  try {
    const content = await readFile(join(root, ".gitignore"), "utf8");
    return compileGitignore(content.split("\n"));
  } catch {
    return { ignored: () => false };
  }
}

function hasAllowedExt(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_ALLOWLIST.has(ext);
}

export async function walk(root: string): Promise<WalkedFile[]> {
  const gitignore = await loadGitignore(root);
  const results: WalkedFile[] = [];

  async function recurse(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      const rel = relative(root, abs);
      const relNorm = rel.split(sep).join("/");
      if (dpsExcluded(relNorm)) continue;
      if (entry.isDirectory()) {
        if (DIR_DENYLIST.has(entry.name)) continue;
        if (gitignore.ignored(rel, true)) continue;
        await recurse(abs);
      } else if (entry.isFile()) {
        if (!hasAllowedExt(entry.name)) continue;
        if (gitignore.ignored(rel, false)) continue;
        let info;
        try {
          info = await stat(abs);
        } catch {
          continue;
        }
        if (info.size > MAX_FILE_BYTES) continue;
        results.push({ relPath: relNorm, absPath: abs, size: info.size, mtimeMs: info.mtimeMs });
      }
    }
  }

  await recurse(root);
  return results;
}

export { MAX_FILE_BYTES };
