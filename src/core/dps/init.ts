/**
 * DPS spec init/inject (data-plane, runs in the USER's repo at runtime).
 *
 * Scaffolds the 4 DPS living-spec files into `<workspace>/.dps/spec/` from the
 * shipped bootstrap templates (pure fs — no Python needed, works under safe
 * mode). Validation wraps the shipped dps.py (Python) and degrades gracefully to
 * a manual-fallback checklist when python3 is absent.
 *
 * NOTE: the spec is injected into the user's project, never into this framework
 * repo. dps.py uses Path.cwd(), so checks run with cwd = `.dps/spec/`.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { skillsBasePath } from "../../skills/skill_loader.js";

const execFileAsync = promisify(execFile);

export const CANONICAL = ["README", "CONTRACTS", "BLUEPRINT", "ADR"] as const;

export function dpsRoot(root: string): string {
  return join(root, ".dps");
}

export function specDir(root: string): string {
  return join(root, ".dps", "spec");
}

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

/** Which of the 4 canonical files already exist in <root>/.dps/spec/. */
export async function detectExistingSpec(root: string): Promise<string[]> {
  const dir = specDir(root);
  const present: string[] = [];
  for (const name of CANONICAL) {
    if (await exists(join(dir, `${name}.md`))) present.push(`${name}.md`);
  }
  return present;
}

async function ensureDpsGitignore(root: string): Promise<void> {
  const gi = join(root, ".dps", ".gitignore");
  // index/ is a regenerable cache; spec/ and agent/ are tracked living knowledge.
  if (!(await exists(gi))) await writeFile(gi, "index/\n*.tmp\n", { mode: 0o644 });
}

export interface ScaffoldResult { created: string[]; skipped: string[]; }

/** Copy the bootstrap templates into <root>/.dps/spec/. Existing files are kept
 * unless overwrite is set. */
export async function scaffoldSpec(root: string, overwrite: boolean): Promise<ScaffoldResult> {
  const dir = specDir(root);
  await mkdir(dir, { recursive: true, mode: 0o755 });
  const tplDir = join(skillsBasePath(), "bootstrap-templates");
  const created: string[] = [];
  const skipped: string[] = [];
  for (const name of CANONICAL) {
    const dest = join(dir, `${name}.md`);
    if (await exists(dest) && !overwrite) { skipped.push(`${name}.md`); continue; }
    const content = await readFile(join(tplDir, `dps-${name}.template.md`), "utf8");
    await writeFile(dest, content, { mode: 0o644 });
    created.push(`${name}.md`);
  }
  await ensureDpsGitignore(root);
  return { created, skipped };
}

export interface DpsCheckResult { ran: boolean; ok?: boolean; output: string; }

/** Wrap the shipped dps.py validator. Returns ran=false (not an error) when
 * python3 is unavailable so the caller can show the manual-fallback checklist. */
export async function runDpsCheck(root: string, mode: "check" | "lint", strict = false): Promise<DpsCheckResult> {
  // dps.py uses Path.cwd() and resolves canonical under spec/ via to_fs(), so run
  // it from the .dps/ root; generated sidecars land in .dps/agent/ + .dps/DPS_LOCK.yml.
  const cwd = dpsRoot(root);
  const script = join(skillsBasePath(), "dps-tools", "dps.py");
  const args = [script, mode];
  if (mode === "lint" && strict) args.push("--strict");
  try {
    const { stdout, stderr } = await execFileAsync("python3", args, { cwd, timeout: 30_000 });
    return { ran: true, ok: true, output: (stdout || stderr || "").trim() };
  } catch (e) {
    const err = e as { code?: string; stdout?: string; stderr?: string };
    if (err.code === "ENOENT") {
      return { ran: false, output: "python3 not found — DPS validation is in manual-fallback mode." };
    }
    // Non-zero exit means dps.py ran but found issues.
    return { ran: true, ok: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}`.trim() || "dps.py reported issues." };
  }
}
