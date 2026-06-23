---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks — dispatches fresh subagent per task with specialist review between tasks, pattern-globalize after bugs, adr-commit at finish.
---

# Subagent-Driven Development

Execute plan by dispatching fresh subagent per task, with three-stage review after each:
spec compliance → code quality → specialist lens (STRIDE/OWASP/ATAM/TEMPORAL/CPT).

**Core principle:** Fresh subagent per task + evidence-gated review = high quality, fast iteration.

**Continuous execution:** Do not pause between tasks. Execute all tasks without stopping
unless: BLOCKED status unresolvable, genuine ambiguity, or all tasks complete.

**Announce:** "Using subagent-driven-development to execute the plan."

---

## Pre-Check

```bash
# Confirm isolated workspace exists
git worktree list
# If not — run using-git-worktrees first
```

Read plan from `docs/superskills/plans/` once. Extract all tasks.

**Create task tracker:**
- Claude Code: `TodoWrite` tool
- Other harnesses: maintain `- [ ]` checklist inline in this session
- Fallback: `echo "[ ] Task N: <name>" >> /tmp/task-tracker.txt`

---

## Per-Task Loop

```
For each task:
  1. Dispatch implementer subagent (full task text + context)
  2. Answer questions if asked BEFORE implementation
  3. Implementer: implements, tests, commits, self-reviews
  4. Stage A: Spec compliance review (spec reviewer subagent)
     → issues found? implementer fixes → re-review → repeat until ✅
  5. Stage B: Code quality review (quality reviewer subagent)
     → issues found? implementer fixes → re-review → repeat until ✅
  6. Stage C: specialist-review (context-aware lens)
     → CRITICAL? fix immediately. HIGH? fix before next task.
     → Bug confirmed? trigger pattern-globalize before proceeding.
  7. verification-before-completion gate — evidence anchor required
  8. Mark task complete in TodoWrite
```

**Do NOT start Stage B before Stage A is ✅.**
**Do NOT mark task complete before verification-before-completion.**

---

## Subagent Context Templates

### Implementer

```
TASK: [Full task text from plan]
PLAN: [Feature goal + architecture from plan header]
CODEBASE: [Relevant file structure]
CONSTRAINTS: Follow tdd-verified. No implementation before failing test.
             No completion claim without verification-before-completion.
STATUS: Report one of: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
```

### Spec Reviewer

```
TASK: Verify implementation matches spec exactly.
SPEC: [Relevant spec sections]
BASE_SHA: [before task]
HEAD_SHA: [after task]
Check: all requirements implemented (no under-build), nothing extra (no over-build).
Report: ✅ COMPLIANT or ❌ ISSUES: [list]
```

### Quality Reviewer

```
TASK: Review code quality only (not spec compliance — already verified).
BASE_SHA: [before task]
HEAD_SHA: [after task]
Check: naming, structure, duplication, error handling, test quality.
Report: ✅ APPROVED or Issues by severity: CRITICAL | HIGH | MEDIUM | LOW
```

---

## Stage C — Specialist Review Integration

After quality review ✅, run `specialist-review` on the task diff.

Signals to check:
- Auth/session/token imports → STRIDE
- User input + web surface → OWASP
- Architecture decision in diff → ATAM
- Async/await/worker patterns → TEMPORAL
- Write chain ≥ 3 components → CPT

Pass specialist lens context to the review subagent. See `specialist-review` for full signal taxonomy.

---

## Pattern-Globalize Trigger

If Stage A, B, or C reveals a confirmed bug (not just style issue):

```
After fix is committed:
→ trigger pattern-globalize immediately
→ do NOT mark task complete until pattern-globalize has run
```

This is mandatory. One confirmed bug = check globally.

---

## Handling Implementer Status

| Status | Action |
|---|---|
| DONE | Proceed to Stage A |
| DONE_WITH_CONCERNS | Read concerns. If correctness/scope → address first. If observation → note and proceed. |
| NEEDS_CONTEXT | Provide context, re-dispatch same model |
| BLOCKED | Diagnose: context problem → more context; too complex → capable model; too large → split; plan wrong → escalate to human |

Never ignore BLOCKED. Something must change before retry.

---

## Model Selection

| Task type | Model |
|---|---|
| Isolated function, clear spec, 1-2 files | Fast/cheap |
| Multi-file, integration concerns | Standard |
| Architecture, design judgment, review | Most capable |

---

## After All Tasks

1. Dispatch final code review subagent (full implementation scope)
2. Invoke `adr-commit` — ADR Gate + PATTERN-DEBT lifecycle + merge options

Do NOT invoke `finishing-a-development-branch`. Use `adr-commit`.

---

## Red Flags — Never

- Start on main/master without explicit user consent
- Skip spec compliance review
- Start code quality review before spec ✅
- Skip specialist-review Stage C
- Skip pattern-globalize after confirmed bug
- Mark task complete without verification-before-completion
- Dispatch parallel implementation subagents (conflicts)
- Give subagent your session context (construct exactly what they need)
- Accept "close enough" on spec compliance

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->
<!-- DO NOT pre-populate with speculation — real observations only -->
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->

## Evidence Boundary

Subagent reports are not T1 evidence for the parent agent. Treat them as T3 until the parent verifies raw output, diff, or runtime behavior directly. Use `shared/subagent-evidence.md` and `verification-before-completion` claim grammar before marking tasks complete.
