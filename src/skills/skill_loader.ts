/**
 * SkillLoader — reads and parses SKILL.md / nano.md files from the skills directory.
 * No shell execution. Returns structured content for the MCP tool handler to return.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function parseFrontmatter(content: string): Record<string, string> {
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

function extractInlineField(content: string, fieldName: string): string {
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

function extractSection(content: string, heading: string): string {
  // Match ## heading (case-insensitive, allow trailing words)
  const pattern = new RegExp(
    `##\\s+${escapeRegex(heading)}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    "i"
  );
  const m = content.match(pattern);
  return m ? m[1].trim() : "";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractChecklist(content: string): string[] {
  let section = extractSection(content, "Checklist");
  if (!section) section = extractSection(content, "Verification Checklist");
  if (!section) section = extractSection(content, "Steps");
  if (!section) section = extractSection(content, "Instructions");

  if (!section) {
    // Some skills list steps inline without a standard heading
    return [];
  }
  const items: string[] = [];
  for (const line of section.split("\n")) {
    const stripped = line.replace(/^[-*\d.]+\.?\s+/, "").trim();
    if (stripped && !stripped.startsWith("#") && !stripped.startsWith("```")) {
      items.push(stripped);
    }
  }
  return items;
}

function extractGotchas(content: string): GotchaEntry[] {
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

function extractOutput(content: string): string {
  // Try ## Output, ## Output Template, ## Evidence Summary
  for (const heading of ["Output", "Output Template", "Evidence Summary"]) {
    const section = extractSection(content, heading);
    if (section) return section;
  }
  return "";
}

// ---------------------------------------------------------------------------
// SkillLoader
// ---------------------------------------------------------------------------

export class SkillLoader {
  /**
   * Load and parse a single skill by name.
   * Throws if the skill directory or SKILL.md does not exist.
   */
  static async load(skillName: string): Promise<ParsedSkill> {
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

    return {
      name: frontmatter.name ?? skillName,
      description: frontmatter.description ?? "",
    register: (() => {
      const raw = extractInlineField(fullContent, "Register");
      // raw may look like: "DISCIPLINE** — runs before..." or "TECHNIQUE"
      const cleaned = raw.replace(/\*\*/g, "").trim();
      // Take only the first word (the actual register value)
      return cleaned.split(/[\s—\-]/)[0] ?? cleaned;
    })(),
      goal: extractInlineField(fullContent, "Goal"),
      constraints: extractInlineField(fullContent, "Constraints")
        .split(/[.;]/)
        .map(s => s.trim())
        .filter(Boolean),
      announce: extractInlineField(fullContent, "Announce"),
      checklist: extractChecklist(fullContent),
      outputTemplate: extractOutput(fullContent),
      gotchas: extractGotchas(fullContent),
      nanoContent,
      fullContent,
    };
  }

  /**
   * Load just the nano content for a skill (lightweight, no parse).
   */
  static async loadNano(skillName: string): Promise<string> {
    const base = skillsBasePath();
    const nanoFile = path.join(base, skillName, `${skillName}.nano.md`);
    try {
      return await fs.readFile(nanoFile, "utf-8");
    } catch {
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
