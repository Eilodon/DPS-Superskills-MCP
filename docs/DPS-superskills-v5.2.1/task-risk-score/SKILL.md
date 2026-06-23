---
name: task-risk-score
description: Use after writing-plans produces a task list, during the Self-Review phase — scores each task for risk and ownership boundaries before handing off to execution.
---

# Task-Risk-Score — FMEA-lite Scoring for Implementation Plans

Runs a lightweight FMEA QBR score on each task in an implementation plan.
Surfaces high-risk tasks and cross-team dependencies before execution begins.

**Activate during the Self-Review section of `writing-plans`**

```bash
# Recent QBR calibration (auto-injected):
!tail -5 docs/superskills/qbr-calibration.md 2>/dev/null || echo "No calibration data yet (pre-empirical threshold: HIGH ≥ 6)"
```
, after the
plan document is written and spec coverage has been checked.

---

## Step 0: Declare Context Type

```
CONTEXT_TYPE: EXTERNAL_SERVICE | BUSINESS_LOGIC | INFRASTRUCTURE | UI
```

**Scoring adjustments — apply BEFORE QBR calculation:**

| Context Type | Adjustment | Rationale |
|---|---|---|
| `EXTERNAL_SERVICE` | D = min(scored_D, 1) | External failures only detectable in prod (tikai-H25 calibration finding) |
| `INFRASTRUCTURE` | B = max(scored_B, 2) | Infra failures cascade upward — blast radius always ≥ module |
| `UI` | Severity cap = 2 unless data loss or auth | UI bugs visible immediately, rollback fast |
| `BUSINESS_LOGIC` | Standard scoring — no adjustment | |

**Mixed context:** pick the HIGHEST-risk type present. A task touching EXTERNAL_SERVICE + BUSINESS_LOGIC → EXTERNAL_SERVICE.

Log context type in scoring table: `CONTEXT: EXTERNAL_SERVICE`

---

## Triage Gate — Run Before Scoring

Check BEFORE invoking QBR. If ALL conditions below are true → skip task-risk-score entirely.

**SKIP conditions (task is trivial):**
- Task touches ONLY: UI strings, CSS/styling, copy text, test fixtures, variable/function renames, comments, documentation
- No file in task scope contains: state mutation, DB access, auth/session logic, async operations, external API calls, config changes, schema changes

**Action when SKIP:**
```
Log inline in plan: "task-risk-score: SKIPPED (trivial — no state/security/async signal)"
Proceed to execution handoff.
```

**RUN conditions (any one is sufficient):**
- Touches persistent state (DB, file system, cache, session)
- Touches security surface (auth, permissions, tokens, secrets)
- Touches concurrency (async, threads, queues, workers)
- Touches external integration (API call, webhook, event bus)
- Crosses module or service boundary
- Affects > 3 files with interdependencies

If ANY run condition fires → proceed to QBR scoring below.

---

## QBR Formula

```
QBR = (Severity × Blast-Radius) / Detectability

Severity:      1 = cosmetic | 2 = degraded UX | 3 = data loss / security / downtime
Blast-Radius:  1 = local/one file | 2 = module/one service | 3 = cross-service/user-facing
Detectability: 3 = caught by unit test | 2 = needs integration test | 1 = only visible in prod

QBR ≥ 6  → HIGH  — mandatory action (see rules below)
QBR 3–5  → MEDIUM — flag, monitor
QBR < 3  → LOW   — proceed normally
```

---

## Boundary Classification ([G.ORG] upgrade)

For each task, classify ownership:

```
SINGLE                    — one team owns all changes end-to-end
CROSS(                    — fix path spans multiple teams
  teams=[team_a, team_b], — all teams whose code changes
  fix-path-owner=team_a,  — team who MERGES the change (not just reviews)
  blocked-until=sign-off  — what approval is needed before this task can close
)
```

**CROSS tasks auto-escalate 1 QBR tier** if `fix-path-owner` ≠ current team.
Example: task scores MEDIUM (QBR=4) + CROSS with external owner → treated as HIGH.

---

## The Process

For each task in the plan, produce a scoring line:

```
Task N: [task name]
  QBR:      S[1-3] × B[1-3] / D[1-3] = [score] → LOW | MEDIUM | HIGH
  Boundary: SINGLE | CROSS(teams=[...], fix-path-owner=..., blocked-until=...)
  Escalated: YES | NO  (CROSS + external owner → YES)
  Action:   [see rules below]
```

Scoring takes < 30 seconds per task — use task description and file paths only.

---

## Action Rules

**HIGH (QBR ≥ 6 OR escalated CROSS):**

- Task MUST be decomposed if it contains > 1 concern
- Verification steps must include integration-level check
- Flag inline: `⚠️ HIGH-RISK` in plan
- CROSS tasks: add explicit handoff step + sign-off requirement

**MEDIUM:**
- Note: `ℹ️ MEDIUM: watch in code review`
- No mandatory action

**Decomposition rule:**
```
❌ "Implement auth middleware and update user schema"  (2 concerns)
✅ Task 2a: Update user schema + migration
   Task 2b: Implement auth middleware (depends on 2a)
```

Re-score each split task. Re-decompose until no HIGH task has > 1 concern.

---

## Scoring Table — Append to Plan Document

```markdown
## Task Risk Summary (task-risk-score)
<!-- task-risk-score: DO NOT DUPLICATE — update this section -->
<!-- last-run: YYYY-MM-DD | sprint: [sprint-id] -->

| Task | S×B/D | QBR | Risk | Boundary | Action |
|------|-------|-----|------|----------|--------|
| Task 1 | 2×2/2 | 4 | MEDIUM | SINGLE | monitor |
| Task 2 | 3×3/1 | 9 | HIGH ⚠️ | CROSS(teams=[be,infra], owner=infra, blocked-until=infra-approval) | decompose + handoff |

**Summary:**
- High-risk tasks: [list]
- Cross-boundary tasks: [list] — confirm sign-off path before sprint starts
- Estimated integration-test surface: [N tasks needing integration tests]
```

---

## [M.AT] QBR Accuracy Tracker

After each sprint retrospective, log actual outcomes to `docs/superskills/qbr-calibration.md`:

```markdown
| <task-id> | <sprint> | <predicted-qbr> | <predicted-risk> | <actual-severity> | <outcome> |
```

**Outcome values:**
- `INCIDENT` — caused a production incident
- `NEAR_MISS` — caught in test/review, would have caused incident
- `NO_IMPACT` — resolved or shipped with no issue
- `OVERESTIMATED` — predicted HIGH but was trivially resolved

**After 5+ sprints:** review calibration table. If HIGH-predicted tasks are > 30% OVERESTIMATED,
raise the HIGH threshold from QBR ≥ 6 to QBR ≥ 7. Log threshold change with rationale.

This keeps QBR calibrated to your actual codebase — not generic industry heuristics.

---

## Red Flags — Never

- Skip scoring because "all tasks look simple" (takes < 5 min for 10-task plan)
- Leave a HIGH task unsplit if it contains multiple concerns
- Ignore CROSS escalation — external-owner tasks are the most common integration failure point
- Skip [M.AT] logging after retrospective — calibration value degrades without data
- Create a duplicate scoring table — update existing instead


## Pressure Tests — Common Rationalizations

- **"Tasks này nhìn đơn giản, không cần score"** → Triage Gate tồn tại để verify điều đó. Chạy nó. 30 giây. Tikai-H25: Redis budget check trông "simple" — QBR=6 MEDIUM nhưng actual = blocking.
- **"Sẽ score sau khi implement"** → QBR là pre-execution only. Post-execution scoring là confirmation bias — bạn đã biết outcome rồi.
- **"Chưa có calibration data nên QBR không chính xác"** → Seed data đã có trong qbr-calibration.md. Uncalibrated > unscored. Bắt đầu log ngay từ hôm nay.
- **"D=2 vì có integration tests"** → "Có integration tests" ≠ "có test cho failure mode này." External service failures (Redis, AI provider, payment) cần D=1 unless có test specifically for that service being DOWN.

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- New entries must follow shared/gotcha-schema.md -->
<!-- DO NOT pre-populate with speculation — real observations only -->
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
    QBR formula thay đổi giữa các VHEATM versions — historical scores không comparable nếu không tag version (Apollos v8.0 vs Tikai v16.0)
  root_cause: >-
    Apollos dùng weighted additive formula (QBR=32 cho cùng severity); Tikai dùng (S×B)/D (QBR=8) — hoàn toàn khác nhau về numeric scale
  do_instead: >-
    Tag mọi M.AT entry với formula version. Trước khi add historical QBR data vào calibration log: verify formula match current version. Scores từ different formula versions không thể dùng để calibrate threshold.
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
    Detectability bị overestimate cho external service failures → QBR underestimate (Tikai H25: predicted MEDIUM/6, actual HIGH/blocking)
  root_cause: >-
    Redis failure được assign D=2 'needs integration test to catch' nhưng không có integration test nào cover failure mode này, và chỉ observable trong production
  do_instead: >-
    Với bất kỳ external service nào (Redis, AI provider, payment gateway, email): nếu không có existing test cover failure mode → set D=1 regardless of general test suite size. 'Has tests' ≠ 'has tests for THIS failure.'
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
    Manual ops steps (không trong migration/automation) score deceptively MEDIUM nhưng mang HIGH operational risk (Tikai H9, QBR=7)
  root_cause: >-
    'ai đó sẽ nhớ run SQL seed' được score là detectable vì 'có trong runbook' nhưng dưới launch pressure, runbooks bị skip
  do_instead: >-
    Với bất kỳ task nào có correctness phụ thuộc vào manual step không trong CI hoặc migration: add +1 vào Severity. 'Chỉ detectable qua human discipline' = D=1.
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
