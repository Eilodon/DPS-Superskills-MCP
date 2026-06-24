/**
 * SkillExecutor — formats a ParsedSkill + caller context into a structured MCP ToolResult text.
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { ParsedSkill } from "./skill_loader.js";
import { skillsBasePath } from "./skill_loader.js";

export type SkillDepth = "nano" | "checklist" | "full";

export interface SkillArgs {
  skill_name: string;
  task_description?: string;
  context?: string;
  error_message?: string;
  query?: string;
  mode?: string;
  depth?: SkillDepth;
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

/**
 * Builds the structured text response returned to the MCP caller.
 * The AI receiving this knows exactly what to announce, what checklist to follow,
 * and what output format to produce — without reading raw Markdown.
 */
export function formatSkillResponse(skill: ParsedSkill, args: SkillArgs, projectCtx?: ProjectContext): string {
  const depth: SkillDepth = args.depth ?? "full";

  if (depth === "nano") {
    return formatNanoResponse(skill, args);
  }
  if (depth === "checklist") {
    return formatChecklistResponse(skill, args, projectCtx);
  }
  return formatFullResponse(skill, args, projectCtx);
}

function formatHeader(skill: ParsedSkill, depth: SkillDepth): string[] {
  return [
    `${"=".repeat(60)}`,
    `SKILL: ${skill.name.toUpperCase()}  [${skill.register}]  depth=${depth}`,
    `${"=".repeat(60)}`,
  ];
}

function formatFooter(skill: ParsedSkill): string[] {
  return [
    `\n${"=".repeat(60)}`,
    `END SKILL: ${skill.name}`,
    `${"=".repeat(60)}`,
  ];
}

function formatEnforcementGates(skill: ParsedSkill): string[] {
  const gates: string[] = [];
  const register = skill.register.toUpperCase();
  const name = skill.name;

  if (register === "DISCIPLINE" || name === "tdd-verified") {
    gates.push("proof_mode_declared: completion requires declared proof mode");
  }
  if (name === "tdd-verified") {
    gates.push("failing_test_evidence: RED gate requires documented test failure before implementation");
    gates.push("passing_test_evidence: GREEN gate requires documented test pass before refactor");
  }
  if (name === "verification-before-completion") {
    gates.push("fresh_verification: completion claim requires T1/T2 evidence from current session");
  }
  if (name === "pattern-globalize") {
    gates.push("grep_executed: bug class grep must be run before closing bug fix");
  }

  if (gates.length === 0) return [];
  return [
    "\nENFORCEMENT GATES (output firewall will flag violations):",
    ...gates.map(g => `  ✓ ${g}`),
  ];
}

function formatCallerContext(args: SkillArgs): string[] {
  const contextLines: string[] = [];
  if (args.task_description) contextLines.push(`Task: ${args.task_description}`);
  if (args.context)          contextLines.push(`Context: ${args.context}`);
  if (args.error_message)    contextLines.push(`Error: ${args.error_message}`);
  if (args.query)            contextLines.push(`Query: ${args.query}`);
  if (args.mode)             contextLines.push(`Mode: ${args.mode}`);

  if (contextLines.length > 0) {
    return ["\nCONTEXT PROVIDED:", ...contextLines.map(l => `  ${l}`)];
  }
  return [];
}

function formatNanoResponse(skill: ParsedSkill, args: SkillArgs): string {
  const sections: string[] = [
    ...formatHeader(skill, "nano"),
  ];

  if (skill.goal) {
    sections.push(`\nGOAL: ${skill.goal}`);
  }

  sections.push(...formatCallerContext(args));

  if (skill.nanoContent) {
    sections.push(
      "\nNANO REFERENCE:",
      skill.nanoContent.trim(),
    );
  } else {
    sections.push(`\nNo nano reference available. Use depth="checklist" or depth="full" for details.`);
  }

  const activeGotchas = skill.gotchas.filter(g => g.status === "ACTIVE");
  if (activeGotchas.length > 0) {
    sections.push(`\nGOTCHAS (${activeGotchas.length} active):`);
    activeGotchas.forEach((g, i) => {
      sections.push(`  ⚠ [G${i + 1}] ${g.claim}`);
    });
  }

  sections.push(...formatFooter(skill));
  return sections.join("\n");
}

function formatChecklistResponse(skill: ParsedSkill, args: SkillArgs, projectCtx?: ProjectContext): string {
  const sections: string[] = [
    ...formatHeader(skill, "checklist"),
  ];

  if (skill.announce) {
    sections.push(`\nANNOUNCE: ${skill.announce}`);
  }

  if (skill.goal) {
    sections.push(`\nGOAL: ${skill.goal}`);
  }

  if (skill.constraints.length > 0) {
    sections.push(
      "\nCONSTRAINTS:",
      ...skill.constraints.map(c => `  • ${c}`),
    );
  }

  sections.push(...formatCallerContext(args));
  sections.push(...formatEnforcementGates(skill));
  if (projectCtx) sections.push(...formatProjectContext(projectCtx));

  if (skill.checklist.length > 0) {
    sections.push("\nCHECKLIST (complete in order):");
    skill.checklist.forEach((item, i) => {
      sections.push(`  [ ] ${i + 1}. ${item}`);
    });
  }

  if (skill.commands.length > 0) {
    sections.push(
      `\nCOMMANDS (${skill.commands.length} extracted bash/sh block(s) — review before running, some are conditional or destructive):`,
    );
    skill.commands.forEach((cmd, i) => {
      sections.push(
        `  --- [${i + 1}] ---`,
        cmd.split("\n").map(l => `  ${l}`).join("\n"),
      );
    });
  }

  const activeGotchas = skill.gotchas.filter(g => g.status === "ACTIVE");
  if (activeGotchas.length > 0) {
    sections.push(`\nGOTCHAS (${activeGotchas.length} active — read before proceeding):`);
    activeGotchas.forEach((g, i) => {
      sections.push(`  ⚠ [G${i + 1}] ${g.claim}`);
      if (g.doInstead) {
        sections.push(`        → DO INSTEAD: ${g.doInstead}`);
      }
    });
  }

  sections.push(...formatFooter(skill));
  return sections.join("\n");
}

function formatFullResponse(skill: ParsedSkill, args: SkillArgs, projectCtx?: ProjectContext): string {
  const sections: string[] = [
    ...formatHeader(skill, "full"),
  ];

  if (skill.announce) {
    sections.push(`\nANNOUNCE: ${skill.announce}`);
  }

  if (skill.goal) {
    sections.push(`\nGOAL: ${skill.goal}`);
  }

  if (skill.constraints.length > 0) {
    sections.push(
      "\nCONSTRAINTS:",
      ...skill.constraints.map(c => `  • ${c}`),
    );
  }

  sections.push(...formatCallerContext(args));
  sections.push(...formatEnforcementGates(skill));
  if (projectCtx) sections.push(...formatProjectContext(projectCtx));

  if (skill.checklist.length > 0) {
    sections.push("\nCHECKLIST (complete in order):");
    skill.checklist.forEach((item, i) => {
      sections.push(`  [ ] ${i + 1}. ${item}`);
    });
  }

  if (skill.commands.length > 0) {
    sections.push(
      `\nCOMMANDS (${skill.commands.length} extracted bash/sh block(s) — review before running, some are conditional or destructive):`,
    );
    skill.commands.forEach((cmd, i) => {
      sections.push(
        `  --- [${i + 1}] ---`,
        cmd.split("\n").map(l => `  ${l}`).join("\n"),
      );
    });
  }

  if (skill.outputTemplate) {
    sections.push(
      "\nOUTPUT TEMPLATE:",
      "─".repeat(40),
      skill.outputTemplate,
      "─".repeat(40),
    );
  }

  const activeGotchas = skill.gotchas.filter(g => g.status === "ACTIVE");
  if (activeGotchas.length > 0) {
    sections.push(`\nGOTCHAS (${activeGotchas.length} active — read before proceeding):`);
    activeGotchas.forEach((g, i) => {
      sections.push(`  ⚠ [G${i + 1}] ${g.claim}`);
      if (g.doInstead) {
        sections.push(`        → DO INSTEAD: ${g.doInstead}`);
      }
    });
  }

  if (skill.nanoContent) {
    sections.push(
      "\nNANO REFERENCE (compressed):",
      "─".repeat(40),
      skill.nanoContent.trim(),
    );
  }

  sections.push(...formatFooter(skill));
  return sections.join("\n");
}

export interface ProjectContext {
  patternDebt: string[];
  domainTerms: string[];
}

export async function loadProjectContext(): Promise<ProjectContext> {
  const base = path.resolve(skillsBasePath(), "..", "..");
  const ctx: ProjectContext = { patternDebt: [], domainTerms: [] };

  try {
    const debtPath = path.join(base, "docs", "superskills", "pattern-debt.md");
    const content = await fs.readFile(debtPath, "utf-8");
    const slugs = [...content.matchAll(/PATTERN-DEBT-([a-z0-9-]+)/g)];
    ctx.patternDebt = slugs.map(m => m[1]);
  } catch { /* file may not exist */ }

  try {
    const ctxPath = path.join(base, "docs", "superskills", "CONTEXT.md");
    const content = await fs.readFile(ctxPath, "utf-8");
    const terms = [...content.matchAll(/^\s*[-*]\s+\*\*(.+?)\*\*/gm)];
    ctx.domainTerms = terms.map(m => m[1]).slice(0, 10);
  } catch { /* file may not exist */ }

  return ctx;
}

function formatProjectContext(ctx: ProjectContext): string[] {
  const lines: string[] = [];
  if (ctx.patternDebt.length > 0) {
    lines.push(
      `\nPROJECT CONTEXT — ACTIVE PATTERN DEBT (${ctx.patternDebt.length}):`,
      ...ctx.patternDebt.map(slug => `  • ${slug}`),
    );
  }
  if (ctx.domainTerms.length > 0) {
    lines.push(
      "\nPROJECT CONTEXT — DOMAIN VOCABULARY:",
      ...ctx.domainTerms.map(term => `  • ${term}`),
    );
  }
  return lines;
}

/**
 * Builds a compact listing of all skills (used by skill_list tool).
 */
export function formatSkillList(skills: Array<{ name: string; description: string; register: string }>): string {
  const byRegister = new Map<string, typeof skills>();
  for (const skill of skills) {
    if (!byRegister.has(skill.register)) byRegister.set(skill.register, []);
    byRegister.get(skill.register)!.push(skill);
  }

  const lines: string[] = [
    "DPS SuperSkills v5.2.1 — Available Skills",
    "=".repeat(50),
    "",
  ];

  for (const [register, items] of byRegister) {
    lines.push(`[${register}]`);
    for (const s of items) {
      lines.push(`  ${s.name}`);
      lines.push(`    ${s.description}`);
    }
    lines.push("");
  }

  lines.push(`Total: ${skills.length} skills`);
  lines.push('Use skill_read(skill_name) to get the full SKILL.md content.');
  lines.push('Use skill_run(skill_name, task_description) to invoke a skill with context.');

  return lines.join("\n");
}
