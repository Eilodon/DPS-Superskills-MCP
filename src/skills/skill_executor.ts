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

function formatSessionConsolidationHint(skill: ParsedSkill): string[] {
  if (skill.name !== "session-handoff" && skill.name !== "knowledge-compound") return [];
  return [
    "\nSESSION CONSOLIDATION HOOK:",
    "  Before closing, capture lessons learned via kb_write so they survive across sessions:",
    "    kb_write(category=\"gotcha\", slug=\"...\", content=\"<what failed + what to do instead>\")",
    "    kb_write(category=\"decision\", slug=\"...\", content=\"<context + decision + consequences>\")",
    "  Entries auto-appear in future skill_run responses via project context injection.",
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
  sections.push(...formatSessionConsolidationHint(skill));
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
  sections.push(...formatSessionConsolidationHint(skill));
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
  knowledgeGotchas: string[];
}

const KB_CATEGORIES = ["gotcha", "bug-pattern"] as const;
const MAX_KB_INJECTED = 8;

function knowledgeBasePath(base: string): string {
  return process.env.MCP_KB_PATH || path.join(base, "docs", "superskills");
}

async function loadKnowledgeBaseHints(kbPath: string): Promise<string[]> {
  const hints: string[] = [];
  for (const category of KB_CATEGORIES) {
    try {
      const file = path.join(kbPath, `${category}.md`);
      const content = await fs.readFile(file, "utf-8");
      const entries = content.split(/(?=^### KB-)/m);
      for (const entry of entries) {
        if (!entry.startsWith("### KB-")) continue;
        const idMatch = entry.match(/^### (KB-[A-Z-]+-[a-z0-9-]+)/);
        const contentMatch = entry.match(/\*\*content:\*\*\s*(.+)/);
        if (!idMatch) continue;
        const summary = (contentMatch?.[1] ?? "").trim().slice(0, 100);
        hints.push(summary ? `${idMatch[1]}: ${summary}` : idMatch[1]);
        if (hints.length >= MAX_KB_INJECTED) return hints;
      }
    } catch { /* file may not exist */ }
  }
  return hints;
}

const PROJECT_CONTEXT_TTL_MS = 30 * 1000;
let projectContextCache: { value: ProjectContext; expiresAt: number } | null = null;

export function clearProjectContextCache(): void {
  projectContextCache = null;
}

export async function loadProjectContext(): Promise<ProjectContext> {
  if (projectContextCache && projectContextCache.expiresAt > Date.now()) {
    return projectContextCache.value;
  }

  const base = path.resolve(skillsBasePath(), "..", "..");
  const kbPath = knowledgeBasePath(base);
  const ctx: ProjectContext = { patternDebt: [], domainTerms: [], knowledgeGotchas: [] };

  try {
    const debtPath = path.join(kbPath, "pattern-debt.md");
    const content = await fs.readFile(debtPath, "utf-8");
    const slugs = [...content.matchAll(/PATTERN-DEBT-([a-z0-9-]+)/g)];
    ctx.patternDebt = slugs.map(m => m[1]);
  } catch { /* file may not exist */ }

  try {
    const ctxPath = path.join(kbPath, "CONTEXT.md");
    const content = await fs.readFile(ctxPath, "utf-8");
    const terms = [...content.matchAll(/^\s*[-*]\s+\*\*(.+?)\*\*/gm)];
    ctx.domainTerms = terms.map(m => m[1]).slice(0, 10);
  } catch { /* file may not exist */ }

  ctx.knowledgeGotchas = await loadKnowledgeBaseHints(kbPath);

  projectContextCache = { value: ctx, expiresAt: Date.now() + PROJECT_CONTEXT_TTL_MS };
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
  if (ctx.knowledgeGotchas.length > 0) {
    lines.push(
      `\nPROJECT CONTEXT — KB GOTCHAS / BUG PATTERNS (${ctx.knowledgeGotchas.length}; use kb_query for full bodies):`,
      ...ctx.knowledgeGotchas.map(hint => `  ⚠ ${hint}`),
    );
  }
  return lines;
}

// Curated typical-next-step routing per skill.
// Agents may deviate (these are hints, not enforced), but the chain documents
// the DPS-recommended flow so a fresh agent doesn't have to guess.
const SKILL_ROUTING_HINTS: Record<string, string[]> = {
  "complexity-gate": ["brainstorming", "tdd-verified"],
  "brainstorming": ["audit-design", "dps-init", "writing-plans"],
  "audit-design": ["writing-plans", "dps-promote"],
  "writing-plans": ["task-risk-score", "executing-plans", "subagent-driven-development"],
  "task-risk-score": ["specialist-review", "executing-plans"],
  "tdd-verified": ["verification-before-completion"],
  "verification-before-completion": ["adr-commit", "release-readiness"],
  "systematic-debugging": ["tdd-verified", "pattern-globalize"],
  "pattern-globalize": ["kb-query", "knowledge-compound"],
  "specialist-review": ["release-readiness", "verification-before-completion"],
  "executing-plans": ["verification-before-completion"],
  "subagent-driven-development": ["specialist-review", "verification-before-completion"],
  "dispatching-parallel-agents": ["verification-before-completion"],
  "release-readiness": ["adr-commit"],
  "adr-commit": ["knowledge-compound"],
  "knowledge-compound": ["epistemic-health-check"],
  "domain-alignment": ["brainstorming"],
  "audit-distill": ["knowledge-compound"],
  "dps-init": ["audit-design"],
  "dps-promote": ["writing-plans"],
  "context-reanchor": ["verification-before-completion"],
  "session-handoff": ["adr-commit"],
  "using-git-worktrees": ["adr-commit"],
  "using-super-skills": ["complexity-gate"],
};

export function suggestedNextSkills(name: string): string[] {
  return SKILL_ROUTING_HINTS[name] ?? [];
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
      const next = suggestedNextSkills(s.name);
      if (next.length > 0) {
        lines.push(`    → suggested next: ${next.join(", ")}`);
      }
    }
    lines.push("");
  }

  lines.push(`Total: ${skills.length} skills`);
  lines.push('Use skill_read(skill_name) to get the full SKILL.md content.');
  lines.push('Use skill_run(skill_name, task_description) to invoke a skill with context.');
  lines.push('Routing hints ("suggested next") are advisory — agents may deviate.');

  return lines.join("\n");
}
