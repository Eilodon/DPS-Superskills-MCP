---
name: pattern-globalize
description: Use immediately after confirming any bug fix — before committing or moving to the next task. Prevents fixing one instance while leaving identical bugs elsewhere.
---

# Pattern-Globalize — One Bug Found = Grep Globally

**Register: TECHNIQUE**
**Goal:** Eliminate the bug class, not just the instance. One confirmed fix triggers a search for siblings.
**Constraints:** Always runs after confirmed fix. In SUBAGENT context: report-only, no fixes outside task scope.
**Adapt:** grep strategy, fix approach, and debt documentation to codebase size and context.

**Schema:** PATTERN-DEBT entries follow `shared/pattern-debt-schema.md`.
All entries stored in `docs/superskills/pattern-debt.md`.

---

## Execution Context — Declare First

```
EXECUTION_CONTEXT: STANDALONE | SUBAGENT
```

**STANDALONE** — called directly:
Goal: fix the bug class globally, not just the instance.
Constraints: fix top 3 highest-risk instances now; write PATTERN-DEBT for remainder.

**SUBAGENT** — called from inside `subagent-driven-development` or `executing-plans`:
Goal: record that a bug class exists for future remediation.
Constraints: write PATTERN-DEBT ONLY — do not fix anything outside current task scope.
(VHEATM Trust Anchor #1: "Read-only by default. Recommends, never self-executes.")

---

## Idempotency Check

```bash
grep -c "PATTERN-DEBT-<slug>" docs/superskills/pattern-debt.md 2>/dev/null
# Count ≥ 1 → update existing entry, do not create duplicate
```

---

## Step 1 — Extract the structural pattern

**Goal:** name the class of bug, not the instance.

```
❌ "null check missing on line 47"         (instance)
✅ "return value used without null check"   (class)

❌ "forgot await on line 82"               (instance)
✅ "async return value consumed synchronously" (class)
```

Generate a slug: lowercase, hyphenated. e.g. `async-no-await`, `missing-null-guard`.

## Step 2 — Grep globally

**Goal:** know the scope of the problem.

```bash
grep -rn "<structural pattern>" . --include="*.py" --include="*.ts" --include="*.js"
# Record exact command — it becomes the grep_cmd in PATTERN-DEBT schema
```

## Step 3 — Branch on count

**≤ 20 results (STANDALONE):**
- Fix all instances in same commit
- Fix Anchor for each: `<file>:<line> — <description>`
- Re-read each changed file section after fix
- Commit: `fix: <pattern-slug> globally (N instances)`

**> 20 results → PATTERN-DEBT:**

Fix top 3 highest-risk now. Log rest using canonical schema:

```yaml
PATTERN-DEBT-<slug>:
  pattern:            "<structural description>"
  grep_cmd:           "<exact grep command>"
  found:              <N>
  fixed_now:          ["file1:line", "file2:line", "file3:line"]
  remaining:          <N-3>
  priority:           HIGH | MEDIUM | LOW
  owner:              <team or person — REQUIRED>
  created_date:       <YYYY-MM-DD>
  created_sprint:     <sprint identifier>
  review_interval:    "<e.g., every 2 sprints>"
  resolution_trigger: "<MEASURABLE — reject: TBD, post-launch, when needed>"
  status:             OPEN
  resolved_date:      null
  actual_outcome:     UNKNOWN
```

**SUBAGENT — any count:**
Skip fixing. Write PATTERN-DEBT entry only. Mark `fixed_now: []`.

## Step 4 — Fix Anchor (every instance fixed)

```
Fix Anchor: <file>:<line> — <description>
Action: re-read file section AFTER fix
Status: VERIFIED | ASSUMED
```

## Step 5 — Commit

```bash
git add <changed files> docs/superskills/pattern-debt.md
git commit -m "fix: <pattern-slug> — N instances (<module>)"
```

---

## PATTERN-DEBT Lifecycle

When `resolution_trigger` fires:
1. Re-run `grep_cmd` → get current count
2. Fix remaining (or next batch of top 3 if > 20)
3. Update `status`: OPEN → IN_PROGRESS → RESOLVED
4. Fill `resolved_date` when `remaining = 0`
5. Fill `actual_outcome` after retrospective:
   - `INCIDENT` | `NEAR_MISS` | `NO_IMPACT` | `UNKNOWN`

`actual_outcome` feeds `[M.AT]` QBR calibration in `task-risk-score`.

---

## Common Rationalizations — All Rejected

| Excuse | Reality |
|---|---|
| "Different context" | Same structural pattern = same bug class. Grep first. |
| "Follow-up PR" | Follow-up PRs for known bugs rarely ship. PATTERN-DEBT now. |
| "Codebase too large" | > 20 results → PATTERN-DEBT protocol. Never skip grep. |

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- New entries must follow shared/gotcha-schema.md -->
- date: 2026-05-31
  status: ACTIVE
  source: production-audit
  evidence: T2
  scope: skill
  applies_when: >-
    this skill is active and the same failure mode is plausible
  avoid_when: >-
    newer T1/T2 evidence shows this failure mode no longer applies in the current project
  last_seen: 2026-05-31
  retire_if: >-
    no recurrence after 6 relevant cycles, or contradictory newer T1/T2 evidence narrows or invalidates the pattern
  claim: >-
    In-memory state pattern xuất hiện trong cả 3 audited codebases độc lập — prior probability HIGH trong mọi codebase mới (Tikai, Aletheia, Apollos)
  root_cause: >-
    mỗi team độc lập chọn in-memory Map/dict vì 'simplicity' mà không consider restart/crash behavior
  do_instead: >-
    Khi BẤT KỲ in-memory state nào được tìm thấy (Map<, HashMap<, dict(), module-level list): treat ngay như PATTERN-DEBT. Không cần đợi evidence gây bug — recurrence across 3 unrelated codebases là prior probability cao. Xem pattern-debt.md: PATTERN-DEBT-inmemory-state-persistence.
- date: 2026-05-31
  status: ACTIVE
  source: production-audit
  evidence: T2
  scope: skill
  applies_when: >-
    this skill is active and the same failure mode is plausible
  avoid_when: >-
    newer T1/T2 evidence shows this failure mode no longer applies in the current project
  last_seen: 2026-05-31
  retire_if: >-
    no recurrence after 6 relevant cycles, or contradictory newer T1/T2 evidence narrows or invalidates the pattern
  claim: >-
    PII classification review phải là pattern search, không phải feature review (Tikai H15 + H33, Aletheia)
  root_cause: >-
    mỗi PII field được review in isolation — refund_reason_raw ở một chỗ, buyer phone ở chỗ khác — pattern không được recognize là một class
  do_instead: >-
    Khi bất kỳ PII-adjacent field nào được confirm: immediately grep ALL free-text user-generated fields trong data model. Apply classification (PII / PII-adjacent / non-PII) cho từng cái. Một unclassified field là evidence pattern tồn tại ở nơi khác.
