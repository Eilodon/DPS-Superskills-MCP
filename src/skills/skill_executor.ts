/**
 * SkillExecutor — formats a ParsedSkill + caller context into a structured MCP ToolResult text.
 */

import type { ParsedSkill } from "./skill_loader.js";

export interface SkillArgs {
  skill_name: string;
  task_description?: string;
  context?: string;
  error_message?: string;
  query?: string;
  mode?: string;
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

/**
 * Builds the structured text response returned to the MCP caller.
 * The AI receiving this knows exactly what to announce, what checklist to follow,
 * and what output format to produce — without reading raw Markdown.
 */
export function formatSkillResponse(skill: ParsedSkill, args: SkillArgs): string {
  const sections: string[] = [];

  // ── Header ──────────────────────────────────────────────────────────────
  sections.push(
    `${"=".repeat(60)}`,
    `SKILL: ${skill.name.toUpperCase()}  [${skill.register}]`,
    `${"=".repeat(60)}`,
  );

  // ── Announce ────────────────────────────────────────────────────────────
  if (skill.announce) {
    sections.push(`\nANNOUNCE: ${skill.announce}`);
  }

  // ── Goal & Constraints ──────────────────────────────────────────────────
  if (skill.goal) {
    sections.push(`\nGOAL: ${skill.goal}`);
  }

  if (skill.constraints.length > 0) {
    sections.push(
      "\nCONSTRAINTS:",
      ...skill.constraints.map(c => `  • ${c}`),
    );
  }

  // ── Caller Context ──────────────────────────────────────────────────────
  const contextLines: string[] = [];
  if (args.task_description) contextLines.push(`Task: ${args.task_description}`);
  if (args.context)          contextLines.push(`Context: ${args.context}`);
  if (args.error_message)    contextLines.push(`Error: ${args.error_message}`);
  if (args.query)            contextLines.push(`Query: ${args.query}`);
  if (args.mode)             contextLines.push(`Mode: ${args.mode}`);

  if (contextLines.length > 0) {
    sections.push("\nCONTEXT PROVIDED:", ...contextLines.map(l => `  ${l}`));
  }

  // ── Checklist ───────────────────────────────────────────────────────────
  if (skill.checklist.length > 0) {
    sections.push("\nCHECKLIST (complete in order):");
    skill.checklist.forEach((item, i) => {
      sections.push(`  [ ] ${i + 1}. ${item}`);
    });
  }

  // ── Output Template ─────────────────────────────────────────────────────
  if (skill.outputTemplate) {
    sections.push(
      "\nOUTPUT TEMPLATE:",
      "─".repeat(40),
      skill.outputTemplate,
      "─".repeat(40),
    );
  }

  // ── Gotchas ─────────────────────────────────────────────────────────────
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

  // ── Nano Ref ─────────────────────────────────────────────────────────────
  if (skill.nanoContent) {
    sections.push(
      "\nNANO REFERENCE (compressed):",
      "─".repeat(40),
      skill.nanoContent.trim(),
    );
  }

  sections.push(
    `\n${"=".repeat(60)}`,
    `END SKILL: ${skill.name}`,
    `${"=".repeat(60)}`,
  );

  return sections.join("\n");
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
