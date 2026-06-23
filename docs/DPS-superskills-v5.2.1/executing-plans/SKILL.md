---
name: executing-plans
description: Use when you have a written implementation plan to execute inline with review checkpoints — alternative to subagent-driven-development for environments without subagent support.
---

# Executing Plans

Load plan, review critically, execute all tasks with verification at each step, finish with adr-commit.

**Prefer `subagent-driven-development` if your harness supports subagents.**
Executing-plans is for environments where subagent dispatch is not available.

**Announce:** "Using executing-plans to implement this plan."

---

## Step 1: Load and Review Plan

1. Read plan file from `docs/superskills/plans/`
2. Review critically — identify questions or concerns
3. If concerns → raise with human before starting
4. If no concerns → create TodoWrite and proceed

---

## Step 2: Execute Tasks

For each task:
1. Mark as `in_progress` in TodoWrite
2. Follow each step exactly — plan has exact code and commands
3. For each code step: use `tdd-verified` (write test → watch fail → implement → watch pass)
4. Run verifications as specified
5. After confirmed bug fix → trigger `pattern-globalize`
6. Before marking done → run `verification-before-completion`
7. Mark as `completed`

---

## Step 3: Finish with adr-commit

After all tasks complete:

1. Announce: "Using adr-commit to complete this work."
2. Invoke `adr-commit` — ADR Gate + G.CDOC + PATTERN-DEBT lifecycle + merge options

Do NOT use `finishing-a-development-branch`. Use `adr-commit`.

---

## When to Stop

**Stop immediately when:**
- Blocker that prevents continuing (missing dependency, repeated test failure)
- Plan has critical gaps preventing starting
- Instruction unclear
- Verification fails repeatedly

Ask for clarification. Do not guess through blockers.

---

## Key Rules

- Review plan critically before starting
- Follow plan steps exactly — do not improvise
- Do not skip verifications
- Stop when blocked, ask for direction
- Never start on main/master without explicit user consent
- `tdd-verified` for every implementation step
- `pattern-globalize` after every confirmed bug
- `verification-before-completion` before every "task complete" mark

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->
<!-- DO NOT pre-populate with speculation — real observations only -->
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
