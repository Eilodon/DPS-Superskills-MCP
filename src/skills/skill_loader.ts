/**
 * SkillLoader — reads and parses SKILL.md / nano.md files from the skills directory.
 * No shell execution. Returns structured content for the MCP tool handler to return.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SKILL_MAP } from "./skill_registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the base path for DPS-superskills-v5.2.1 content.
 * Resolution order:
 *   1. MCP_SKILLS_PATH env var (explicit override)
 *   2. <project_root>/docs/DPS-superskills-v5.2.1
 *   3. Fallback: walk up from __dirname until we find the docs dir
 */
export function skillsBasePath(): string {
  if (process.env.MCP_SKILLS_PATH) {
    return process.env.MCP_SKILLS_PATH;
  }
  // __dirname = dist/skills or src/skills — walk up 2 levels to reach project root
  const projectRoot = path.resolve(__dirname, "..", "..");
  return path.join(projectRoot, "docs", "DPS-superskills-v5.2.1");
}

// ---------------------------------------------------------------------------
// Parsed skill shape
// ---------------------------------------------------------------------------

export interface ParsedSkill {
  name: string;
  description: string;    // from SKILL.md frontmatter
  register: string;       // DISCIPLINE / TECHNIQUE / etc.
  goal: string;           // from **Goal:** line
  constraints: string[];  // from **Constraints:** lines
  announce: string;       // from **Announce:** line
  checklist: string[];    // numbered/bulleted steps from ## Checklist section
  outputTemplate: string; // content of ## Output section
  commands: string[];     // fenced bash/sh blocks extracted from the skill body
  gotchas: GotchaEntry[]; // parsed Gotcha entries
  nanoContent: string;    // full content of <skill>.nano.md
  fullContent: string;    // full raw SKILL.md content
}

export interface GotchaEntry {
  claim: string;
  doInstead: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Markdown parsers
// ---------------------------------------------------------------------------

export function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim().replace(/^"|"$/g, "");
    if (key) result[key] = value;
  }
  return result;
}

export function extractInlineField(content: string, fieldName: string): string {
  // Handles:
  //   **Register: DISCIPLINE** — trailing text
  //   **Goal:** text here
  //   **Announce:** "text here"
  const escapedField = escapeRegex(fieldName);
  // Pattern 1: **Field: value** (value inside bold)
  const p1 = new RegExp(`\\*\\*${escapedField}:\\s*([^*\n]+?)\\*\\*`, "i");
  const m1 = content.match(p1);
  if (m1) return m1[1].trim().replace(/^"|"$/g, "");

  // Pattern 2: **Field:** value (value after bold)
  const p2 = new RegExp(`\\*\\*${escapedField}:\\*\\*\\s*(.+)`, "i");
  const m2 = content.match(p2);
  if (!m2) return "";
  return m2[1].trim().replace(/^"|"$/g, "").replace(/\.$/, "");
}

export function extractSection(content: string, heading: string): string {
  // Line-scanning (not single-regex) so that headings inside fenced code blocks
  // (e.g. a literal "## Task Summary" inside a ```markdown template) never get
  // mistaken for the real heading that starts or ends the section.
  const lines = content.split("\n");
  const headingRe = new RegExp(`^##\\s+${escapeRegex(heading)}\\b`, "i");
  const anyHeadingRe = /^##\s+/;

  let startIdx = -1;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (!inFence && headingRe.test(line)) { startIdx = i; break; }
  }
  if (startIdx === -1) return "";

  inFence = false;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (!inFence && anyHeadingRe.test(line)) { endIdx = i; break; }
  }

  return lines.slice(startIdx + 1, endIdx).join("\n").trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractChecklist(content: string): string[] {
  let section = extractSection(content, "Checklist");
  if (!section) section = extractSection(content, "Verification Checklist");
  if (!section) section = extractSection(content, "Steps");
  if (!section) section = extractSection(content, "Instructions");

  if (section) {
    const items: string[] = [];
    for (const rawLine of section.split("\n")) {
      const trimmed = rawLine.trim();
      // Skip bare horizontal-rule dividers ("---", "***") — not real items.
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) continue;
      // Strip a leading bullet ("- ", "* ") or number marker ("1.", "7b.", "12)").
      let stripped = trimmed.replace(/^(?:[-*]|\d+[a-z]?[.)])\s+/i, "");
      // Strip a GFM task-list checkbox, whether or not it followed a bullet
      // (some skills write "[ ] Item" directly inside a fenced ```text block).
      stripped = stripped.replace(/^\[[ xX]\]\s*/, "");
      if (stripped && !stripped.startsWith("#") && !stripped.startsWith("```")) {
        items.push(stripped);
      }
    }
    if (items.length > 0) return items;
  }

  // Most skills don't use a named "Checklist" section — they lay out the
  // workflow as a sequence of "## Step N: <title>" headings instead. Fall
  // back to collecting those headings (in document order) as the checklist.
  // eslint-disable-next-line security/detect-unsafe-regex -- bounded to a single line (no `\n` in `.`), applied to trusted local skill files only
  const stepHeadings = [...content.matchAll(/^##\s+(Step\s+\d+(?:\.\d+)?[a-z]?.*)$/gim)];
  if (stepHeadings.length > 0) {
    return stepHeadings.map(m => m[1].trim());
  }

  return [];
}

export function extractCommands(content: string): string[] {
  const commands: string[] = [];
  const fenceRe = /```(bash|sh)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(content)) !== null) {
    const code = m[2].trim();
    if (code) commands.push(code);
  }
  return commands;
}

export function extractGotchas(content: string): GotchaEntry[] {
  const section = extractSection(content, "Gotchas");
  if (!section) return [];

  const entries: GotchaEntry[] = [];
  // YAML-ish block entries (new schema style)
  const claimMatches = [...section.matchAll(/claim:\s*>-\s*\n([\s\S]*?)(?=\n\s{0,2}\w+:|$)/g)];
  const doInsteadMatches = [...section.matchAll(/do_instead:\s*>-\s*\n([\s\S]*?)(?=\n\s{0,2}\w+:|$)/g)];
  const statusMatches = [...section.matchAll(/status:\s*(\w+)/g)];

  for (let i = 0; i < claimMatches.length; i++) {
    entries.push({
      claim: claimMatches[i][1].replace(/\s+/g, " ").trim(),
      doInstead: doInsteadMatches[i]?.[1].replace(/\s+/g, " ").trim() ?? "",
      status: statusMatches[i]?.[1] ?? "ACTIVE",
    });
  }

  // Legacy one-liner style: - [date] What failed | Root cause | Do instead
  if (entries.length === 0) {
    for (const line of section.split("\n")) {
      const m = line.match(/^-\s+\[.*?\]\s+(.+)/);
      if (m) {
        const parts = m[1].split("|").map(s => s.trim());
        entries.push({
          claim: parts[0] ?? m[1],
          doInstead: parts[2] ?? "",
          status: "ACTIVE",
        });
      }
    }
  }

  return entries.filter(e => e.status === "ACTIVE" && e.claim);
}

export function extractOutput(content: string): string {
  // Try the handful of heading spellings skills actually use for "what to
  // produce when this skill is done".
  for (const heading of ["Output", "Output Template", "Evidence Summary", "Execution Handoff"]) {
    const section = extractSection(content, heading);
    if (section) return section;
  }
  return "";
}

// ---------------------------------------------------------------------------
// SkillLoader
// ---------------------------------------------------------------------------

const SKILL_CACHE_TTL_MS = 5 * 60 * 1000;
const skillCache = new Map<string, { value: ParsedSkill; expiresAt: number }>();
const nanoCache = new Map<string, { value: string; expiresAt: number }>();

function cacheGet<T>(store: Map<string, { value: T; expiresAt: number }>, key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet<T>(store: Map<string, { value: T; expiresAt: number }>, key: string, value: T): void {
  store.set(key, { value, expiresAt: Date.now() + SKILL_CACHE_TTL_MS });
}

export class SkillLoader {
  static clearCache(): void {
    skillCache.clear();
    nanoCache.clear();
  }

  /**
   * Load and parse a single skill by name.
   * Throws if the skill directory or SKILL.md does not exist.
   */
  static async load(skillName: string): Promise<ParsedSkill> {
    const cached = cacheGet(skillCache, skillName);
    if (cached) return cached;
    const base = skillsBasePath();
    const skillDir = path.join(base, skillName);
    const skillFile = path.join(skillDir, "SKILL.md");
    const nanoFile = path.join(skillDir, `${skillName}.nano.md`);

    let fullContent: string;
    try {
      fullContent = await fs.readFile(skillFile, "utf-8");
    } catch {
      throw new Error(`[SkillLoader] Skill not found: ${skillName} (looked at ${skillFile})`);
    }

    let nanoContent = "";
    try {
      nanoContent = await fs.readFile(nanoFile, "utf-8");
    } catch {
      // nano file is optional — not all skills have one
    }

    const frontmatter = parseFrontmatter(fullContent);

    const parsed: ParsedSkill = {
      name: frontmatter.name ?? skillName,
      description: frontmatter.description ?? "",
      register: (() => {
        const raw = extractInlineField(fullContent, "Register");
        // raw may look like: "DISCIPLINE** — runs before..." or "TECHNIQUE"
        const cleaned = raw.replace(/\*\*/g, "").trim();
        // Take only the first word (the actual register value)
        const parsed = cleaned.split(/[\s—-]/)[0] ?? cleaned;
        // ~45% of skills never declare an inline Register line at all — fall
        // back to the curated registry rather than surfacing an empty value.
        return parsed || SKILL_MAP.get(skillName)?.register || "";
      })(),
      goal: extractInlineField(fullContent, "Goal"),
      constraints: extractInlineField(fullContent, "Constraints")
        .split(/[.;]/)
        .map(s => s.trim())
        .filter(Boolean),
      announce: extractInlineField(fullContent, "Announce"),
      checklist: extractChecklist(fullContent),
      outputTemplate: extractOutput(fullContent),
      commands: extractCommands(fullContent),
      gotchas: extractGotchas(fullContent),
      nanoContent,
      fullContent,
    };

    cacheSet(skillCache, skillName, parsed);
    return parsed;
  }

  /**
   * Load just the nano content for a skill (lightweight, no parse).
   */
  static async loadNano(skillName: string): Promise<string> {
    const cached = cacheGet(nanoCache, skillName);
    if (cached !== undefined) return cached;
    const base = skillsBasePath();
    const nanoFile = path.join(base, skillName, `${skillName}.nano.md`);
    try {
      const content = await fs.readFile(nanoFile, "utf-8");
      cacheSet(nanoCache, skillName, content);
      return content;
    } catch {
      cacheSet(nanoCache, skillName, "");
      return "";
    }
  }

  /**
   * Verify that the skills base path exists and is readable.
   */
  static async assertAccessible(): Promise<void> {
    const base = skillsBasePath();
    try {
      await fs.access(base);
    } catch {
      throw new Error(
        `[SkillLoader] Skills directory not accessible: ${base}\n` +
        `Set MCP_SKILLS_PATH env var to point to docs/DPS-superskills-v5.2.1`
      );
    }
  }
}
