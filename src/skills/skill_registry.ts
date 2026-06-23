/**
 * Static registry of all DPS SuperSkills v5.2.1 skills.
 * Maps skill slug → metadata (register, category, description).
 */

export type SkillRegister = "DISCIPLINE" | "TECHNIQUE" | "KNOWLEDGE LAYER" | "REFERENCE";

export interface SkillMeta {
  name: string;          // slug used as directory name
  description: string;   // from SKILL.md frontmatter
  register: SkillRegister;
}

// Ordered as they appear in the README
export const SKILL_REGISTRY: readonly SkillMeta[] = [
  // ── DISCIPLINE ─────────────────────────────────────────────────────────────
  {
    name: "complexity-gate",
    description: "Use before any software-development task — classifies complexity C0-C4, selects minimum required Super Skills, prevents both under-use and over-use of ceremony.",
    register: "DISCIPLINE",
  },
  {
    name: "tdd-verified",
    description: "Use before ANY implementation code — enforces proof-first discipline (failing test before code, or explicit proof mode for non-behavior work).",
    register: "DISCIPLINE",
  },
  {
    name: "verification-before-completion",
    description: "Use before ANY completion claim — enforces T1/T2 evidence. 'Should work' (T4) is never evidence.",
    register: "DISCIPLINE",
  },
  {
    name: "context-reanchor",
    description: "Use in long sessions, phase transitions, or before completion after drift risk — guards against intra-session instruction drift.",
    register: "DISCIPLINE",
  },
  {
    name: "epistemic-health-check",
    description: "Use periodically to detect stale ADRs, Gotchas, ASSUMED/T4 claims, and calibration drift. Automated staleness scanner.",
    register: "DISCIPLINE",
  },
  {
    name: "privacy-secrets-gate",
    description: "Use when data sensitivity is 2 or 3, or secrets/PII/payment/regulated data may appear — C4 privacy and secrets gate.",
    register: "DISCIPLINE",
  },

  // ── TECHNIQUE ──────────────────────────────────────────────────────────────
  {
    name: "brainstorming",
    description: "Use before any feature, component, or behavior change — explores user intent and design before implementation. Terminal state: audit-design → writing-plans.",
    register: "TECHNIQUE",
  },
  {
    name: "dps-init",
    description: "Use after brainstorming SPEC_APPROVED for non-trivial projects — elevates approved spec into DPS DRAFT canonical structure.",
    register: "TECHNIQUE",
  },
  {
    name: "audit-design",
    description: "Use when SPEC_APPROVED:true or SPEC_ESCALATION:true — design-time risk gate. Returns PASS | FLAGS | HOLD.",
    register: "TECHNIQUE",
  },
  {
    name: "dps-promote",
    description: "Use after audit-design PASS — manages DPS lifecycle gates: DRAFT → PROOF-READY → APPROVED-SSOT → IMPLEMENTATION-ACTIVE → LIVING-SPEC.",
    register: "TECHNIQUE",
  },
  {
    name: "writing-plans",
    description: "Use after audit-design PASS — produces structured implementation plans. task-risk-score Self-Review is mandatory.",
    register: "TECHNIQUE",
  },
  {
    name: "task-risk-score",
    description: "Use in writing-plans Self-Review — scores task risk across 5 dimensions, routes to appropriate mitigation.",
    register: "TECHNIQUE",
  },
  {
    name: "systematic-debugging",
    description: "Use when encountering any bug, test failure, or unexpected behavior — before proposing any fix. Requires root cause investigation with evidence anchors.",
    register: "TECHNIQUE",
  },
  {
    name: "pattern-globalize",
    description: "Use after every confirmed bug — finds the bug class and checks for recurrence across the codebase.",
    register: "TECHNIQUE",
  },
  {
    name: "specialist-review",
    description: "Use before task completion/merge — routes to STRIDE/OWASP/ATAM/TEMPORAL/CPT/MIGRATION specialist lenses.",
    register: "TECHNIQUE",
  },
  {
    name: "release-readiness",
    description: "Use before merge/deploy/traffic/migration for C3/C4 work — operational gate checking observability, rollback, and evidence.",
    register: "TECHNIQUE",
  },
  {
    name: "subagent-driven-development",
    description: "Use when Task tool is available — 3-stage per-task workflow: spec → quality → specialist.",
    register: "TECHNIQUE",
  },
  {
    name: "executing-plans",
    description: "Use when no Task tool available — executes plan tasks with tdd-verified + verification-before-completion per task.",
    register: "TECHNIQUE",
  },
  {
    name: "dispatching-parallel-agents",
    description: "Use when 2+ tasks are independent and share no files — coordinates parallel subagent execution.",
    register: "TECHNIQUE",
  },
  {
    name: "receiving-code-review",
    description: "Use when receiving a code review — clarify ALL unclear items before implementing anything.",
    register: "TECHNIQUE",
  },
  {
    name: "using-git-worktrees",
    description: "Use before feature work — sets up Git worktree isolation. Finish with adr-commit.",
    register: "TECHNIQUE",
  },
  {
    name: "session-handoff",
    description: "Use when session is ending and task is unfinished — captures state for next session. Commit before close.",
    register: "TECHNIQUE",
  },

  // ── KNOWLEDGE LAYER ────────────────────────────────────────────────────────
  {
    name: "domain-alignment",
    description: "Use for new project or domain area — builds CONTEXT.md vocabulary before brainstorming. Missing context layer skill.",
    register: "KNOWLEDGE LAYER",
  },
  {
    name: "knowledge-compound",
    description: "Use after every adr-commit — extracts lessons into compound-wiki and CONTEXT.md. Makes the framework measurably smarter each cycle.",
    register: "KNOWLEDGE LAYER",
  },
  {
    name: "audit-distill",
    description: "Use when VHEATM audit report is available — extracts T1/T2 findings into Gotchas, pattern-debt, and M.AT entries.",
    register: "KNOWLEDGE LAYER",
  },
  {
    name: "adr-commit",
    description: "Use before every merge — records architecture decisions. Owner field and measurable trigger required. Rejects 'TBD'.",
    register: "KNOWLEDGE LAYER",
  },

  // ── REFERENCE ──────────────────────────────────────────────────────────────
  {
    name: "kb-query",
    description: "Use before 'have we decided on X?' — queries ADRs, pattern-debt registry, specs, and plans using keyword search.",
    register: "REFERENCE",
  },
  {
    name: "skill-init",
    description: "Use once per project — creates docs/superskills/ structure with CONSTITUTION.md and DPS scaffold.",
    register: "REFERENCE",
  },
  {
    name: "writing-super-skills",
    description: "Use before creating or editing any skill — RED baseline test first. Framework self-improvement skill.",
    register: "REFERENCE",
  },
  {
    name: "framework-doctor",
    description: "Use before releasing/installing/modifying Super Skills — self-audit for registry, YAML, stale docs, and tooling.",
    register: "REFERENCE",
  },
  {
    name: "using-super-skills",
    description: "Use when starting any conversation or software-development task — establishes the Super Skills registry, runs complexity-gate for proportional rigor, and prevents rationalized skill skipping.",
    register: "REFERENCE",
  },
] as const;

/** Map from skill name slug to SkillMeta for O(1) lookup. */
export const SKILL_MAP = new Map<string, SkillMeta>(
  SKILL_REGISTRY.map(s => [s.name, s])
);

/** All valid skill names as a tuple for Zod enum. */
export const SKILL_NAMES = SKILL_REGISTRY.map(s => s.name) as [string, ...string[]];

/** Skills grouped by register. */
export function skillsByRegister(register: SkillRegister): SkillMeta[] {
  return SKILL_REGISTRY.filter(s => s.register === register);
}
