# Super Skills v5.1

This project uses the Super Skills methodology (Superskills × VHEATM).
**Load and follow the skill registry below before every task — including clarifying questions.**

---

## Enforcement — Before ANY action

```
BUDGET MODE: turn > 20 → compressed output, nano refs over full skills.
```


```
For software work, run complexity-gate first. Inside selected tier, 1% chance a required/eligible skill applies → invoke it.
Circuit breaker: git log shows 3+ fix:/wip commits on same feature → systematic-debugging FIRST. Long-session drift → context-reanchor.
No Task tool → executing-plans. No TodoWrite → inline - [ ] checklist.
```

---

## Skill Registry — nano

**Top-Level Routing**
- `complexity-gate` — before software-development work. Scores C0-C4 and selects proportional rigor.

**Knowledge Foundation (run first)**
- `domain-alignment` — new project or domain area. Builds CONTEXT.md vocabulary before brainstorming.
- `knowledge-compound` — after every adr-commit. Extracts lessons into compound-wiki + CONTEXT.md.

**Design & Planning**
- `brainstorming` — before any feature/component/change. Terminal: audit-design → writing-plans.
- `dps-init` — after brainstorming SPEC_APPROVED, non-trivial projects. Elevates spec → DPS DRAFT.
- `audit-design` — SPEC_APPROVED:true or SPEC_ESCALATION:true. Gate: PASS|FLAGS|HOLD.
- `dps-promote` — after audit-design PASS (DRAFT→PROOF-READY); after user sign-off (PROOF-READY→APPROVED-SSOT); after first production cycle (IMPLEMENTATION-ACTIVE→LIVING-SPEC).
- `writing-plans` — after audit-design PASS. task-risk-score in Self-Review mandatory.
- `task-risk-score` — writing-plans Self-Review. Skip only: UI/CSS/rename/comment tasks.

**Execution**
- `using-git-worktrees` — before feature work. Finish: adr-commit (not finishing-a-development-branch).
- `subagent-driven-development` — Task tool available. 3 stages per task: spec→quality→specialist.
- `executing-plans` — no Task tool. tdd-verified + verification-before-completion per task.
- `dispatching-parallel-agents` — 2+ independent tasks, no shared files.

**Discipline Gates (non-negotiable)**
- `tdd-verified` — before ANY implementation code. Delete code written before test. Always.
- `verification-before-completion` — before ANY completion claim. T4 ("should work") ≠ evidence.
- `context-reanchor` — long sessions, phase transitions, many files loaded, or before completion after drift risk.

**Debug & Review**
- `systematic-debugging` — any bug/failure. Phase 1 root cause before any fix.
- `pattern-globalize` — after every confirmed bug. STANDALONE: fix. SUBAGENT: report only.
- `specialist-review` — before task completion/merge. STRIDE/OWASP/ATAM/TEMPORAL/CPT/MIGRATION routing.
- `release-readiness` — before merge/deploy/traffic/migration for C3/C4 work.
- `receiving-code-review` — clarify ALL unclear items before implementing anything.

**Completion**
- `adr-commit` — before every merge. Owner field + measurable trigger required. Reject: "TBD".

**Knowledge**
- `kb-query` — before "have we decided on X?". Never create duplicate ADR without checking.
- `session-handoff` — when the session is ending and task is not done. Commit before closing.
- `audit-distill` — when a VHEATM audit report is available. Extracts T1/T2 findings → Gotchas + pattern-debt + M.AT.
- `skill-init` — once per project. Creates docs/superskills/ structure.
- `writing-super-skills` — before creating/editing any skill. RED baseline test first.
- `framework-doctor` — before releasing/installing/modifying Super Skills itself.

---

## Skill tiers

Each skill has three tiers in `~/.claude/skills/<skill>/`:
- `<skill>.nano.md` — 50-80 words (this registry is built from these)
- `SKILL.md` — full skill (invoke via Skill tool for detail)
- `shared/` — reference material (vheatm-glossary, tool-compatibility, pattern-debt-schema)

## Priority

1. User instructions (CLAUDE.md, direct requests) — highest
2. Super Skills — self-contained, no external dependencies
3. Default behavior
