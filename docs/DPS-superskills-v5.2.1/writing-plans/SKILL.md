---
name: writing-plans
description: Use when you have an approved spec with audit-design PASS gate, before touching code — produces a comprehensive implementation plan with risk-scored tasks.
---

# Writing Plans

Write comprehensive implementation plans assuming the engineer has zero codebase context
and questionable taste. Exact file paths. Complete code. Expected output at each step.
DRY. YAGNI. TDD. Frequent commits.

**Announce:** "Using writing-plans to create the implementation plan."

Save to: `docs/superskills/plans/YYYY-MM-DD-<feature-name>.md`

---

## Pre-Check

Confirm `audit-design` Gate Result is PASS or PASS WITH FLAGS before starting.
If Gate Result = HOLD → return to `brainstorming`. Do not write a plan for an unapproved design.

---

## DPS Section 8 Check

```bash
# Check if DPS has build order:
grep -c "PHASE 0" .dps/spec/BLUEPRINT.md 2>/dev/null | xargs echo "DPS phases defined:"
```

If DPS APPROVED-SSOT AND Section 8 has phases filled:
  → Import phase/task structure from BLUEPRINT Section 8
  → Plan document: add header `> Build order imported from DPS BLUEPRINT §8`
  → Do NOT create new build order — work within DPS phases

If DPS APPROVED-SSOT AND Section 8 is empty/template:
  → Generate plan as normal
  → Write phase/task structure BACK to BLUEPRINT Section 8
  → Commit: `git commit -m "dps: populate BLUEPRINT §8 build order [writing-plans]"`

If DPS NOT PRESENT:
  → Standard behavior (unchanged)

---

## Scope Check

If spec covers multiple independent subsystems → suggest splitting into separate plans.
Each plan produces working, testable software on its own.

---

## File Structure

Before defining tasks, map which files are created/modified and each one's responsibility.

- One clear responsibility per file
- Files that change together should live together
- Follow existing patterns in existing codebases

---

## Task Granularity (2–5 min each)

```
"Write the failing test"           — step
"Run it, confirm it fails"         — step
"Write minimal implementation"     — step
"Run tests, confirm pass"          — step
"Commit"                           — step
```

---

## Plan Document Header

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended)
> or `executing-plans` to implement this plan task-by-task.

**Goal:** [One sentence]
**Architecture:** [2-3 sentences]
**Tech Stack:** [Key technologies]
**Audit Gate:** [PASS | PASS WITH FLAGS — from audit-design]
**Risk Flags:** [HIGH tasks from task-risk-score, or "none"]

---
```

---

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**
```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```
- [ ] **Step 2: Run — verify FAIL** `pytest tests/...::test_name` → expected: FAIL
- [ ] **Step 3: Write minimal implementation** [complete code]
- [ ] **Step 4: Run — verify PASS** `pytest tests/...::test_name` → expected: PASS
- [ ] **Step 5: Commit** `git commit -m "feat: ..."`
````

---

## No Placeholders

Plan failures — never write:
- "TBD", "TODO", "implement later"
- "Add appropriate error handling" (show the code)
- "Write tests for the above" (show the test code)
- "Similar to Task N" (repeat the code — tasks may be read out of order)
- Steps without code blocks for code steps
- References to types or functions not defined in any task

---

## Self-Review (run after writing full plan)

**1. Spec coverage** — every spec requirement has a task. List gaps.
**2. Placeholder scan** — search for any pattern from "No Placeholders". Fix all.
**3. Type consistency** — method names in Task 3 match Task 7? Fix drift.
**4. Risk scoring** — invoke `task-risk-score` on the completed task list before handoff.

`task-risk-score` appends the Risk Summary table. HIGH tasks must be decomposed or flagged.
CROSS boundary tasks must have explicit handoff steps.

Do not offer execution until task-risk-score has run.

---

## Execution Handoff

```
Plan complete: docs/superskills/plans/<filename>.md
Risk summary: [N HIGH tasks, N CROSS boundaries]

Execution options:
1. Subagent-Driven (recommended) — fresh subagent per task, specialist-review between tasks
2. Inline Execution — batch execution with checkpoints

Which approach?
```

- Subagent-Driven → invoke `subagent-driven-development`
- Inline → invoke `executing-plans`

---

## Red Flags — Never

- Start plan without audit-design PASS gate
- Write placeholder steps
- Hand off without running task-risk-score
- Reference file paths without exact locations

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->
<!-- DO NOT pre-populate with speculation — real observations only -->
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
