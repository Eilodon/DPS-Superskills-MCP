---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior — before proposing any fix. Requires root cause investigation with evidence anchors before attempting solution.
---

# Systematic Debugging

**Register: TECHNIQUE**
**Goal:** Identify root cause with evidence before attempting any fix.
**Constraints:** No fix attempts before Phase 1 complete. Evidence Anchor at each phase. Confirmed fix → `pattern-globalize` immediately.
**Adapt:** the four phases below are a proven approach — adapt how you execute them to context, complexity, and available tools.

```bash
# Recent changes for context (auto-injected):
!git log --oneline -7 2>/dev/null || echo "No git history available"
```

---

## Core Constraints

```
1. Root cause investigation completes before first fix attempt
2. Every phase produces an Evidence Anchor (not a claim — an observation)
3. Confirmed fix triggers pattern-globalize — always
```

---

## Four Phases

### Phase 1 — Understand the Failure

**Goal:** Know exactly what is broken and why — not guessing.
**Constraints:**
- Document Evidence Anchor before forming any hypothesis: exact error text, file:line, reproduction steps
- If not reproducible → gather more data. Do not guess.
- Multi-component system → instrument each boundary before hypothesizing

```bash
# Evidence Anchor format:
Error:        "<exact message>"
Location:     <file>:<line>
Reproducible: YES | NO | INTERMITTENT
Recent change: <git sha> — <description> (from !git log above)
```

Instrument at boundaries when system has multiple components:
```bash
echo "=== Component A output: ===" && <check>
echo "=== Component B input:  ===" && <check>
# Find WHERE it breaks, then investigate that component
```

### Phase 2 — Find the Pattern

**Goal:** Understand the structural cause, not just the specific instance.
**Constraints:**
- Find a working example of similar code in the codebase before proposing a fix
- Read reference implementations completely — no skimming
- List every difference between working and broken, however small

```
Evidence Anchor: "Working: <file>:<line> | Broken: <file>:<line> | Difference: <what differs>"
```

### Phase 3 — Hypothesis and Test

**Goal:** Confirm root cause with minimal intervention.
**Constraints:**
- One hypothesis at a time. Write it down before testing.
- Smallest possible change to test the hypothesis — one variable
- If hypothesis fails → form new hypothesis, do NOT add fixes on top

```
Hypothesis: "X is the root cause because Y"
Test: <smallest change to verify>
Result: CONFIRMED | REJECTED → [new hypothesis if rejected]
```

### Phase 4 — Fix and Verify

**Goal:** Fix the root cause, not the symptom. Leave the codebase cleaner.
**Constraints:**
- Use `tdd-verified`: failing test before fix, passing test after
- Fix Anchor: re-read `<file>:<line>` after the fix before claiming resolved
- Trigger `pattern-globalize` — one confirmed bug = check globally

```
Fix Anchor: <file>:<line> — <description of change>
Re-read:    DONE
Test:       <N/N passing>
Pattern:    pattern-globalize triggered → YES | PATTERN-DEBT created → YES/NO
```

**If 3+ fix attempts fail on same component → Phase 4.5:**
```bash
git log --oneline -10 | grep -icE "fix:|wip|attempt"
# ≥ 3 → STOP. Question the architecture before attempting more fixes.
```

---

## Evidence Summary

```
DEBUGGING RECORD
Error:      <exact message>
Root cause: <file>:<line> — <structural cause>
Fix:        <file>:<line> — <change>
Evidence:   T[1-4] — <command + output>
Tests:      <N/N passing>
Compounded: pattern-globalize run → YES/NO
```

---

## Common Rationalizations — All Rejected

| Excuse | Reality |
|---|---|
| "Too simple, skip Phase 1" | Simple bugs have root causes. Phase 1 is fast for simple bugs. |
| "Emergency, no time" | Systematic is faster than thrashing. Discipline under pressure matters more. |
| "I see the problem" | Seeing a symptom ≠ knowing root cause. |
| "One more fix" (after 2+) | 3+ failures = architecture question. Phase 4.5. |


## Pressure Tests — Common Rationalizations

- **"Tôi biết vấn đề là gì, fix ngay thôi"** → Đây là sự khác biệt giữa symptom và root cause. Non-critical dependency trên critical path (tikai-H25) trông như "import fail" nhưng root cause là Redis. Phase 1 trước.
- **"Failure này random/intermittent"** → Intermittent = shared mutable state suspect. grep module-level globals trước khi investigate individual components.
- **"Đã fix rồi, chắc ổn"** → Fix Anchor + re-run required. "Chắc ổn" là T4. Evidence Anchor là T1.
- **"Bug này nhỏ, không cần pattern-globalize"** → Apollos có 3 "nhỏ" bugs từ cùng một pattern class. Pattern size không liên quan đến recurrence probability.

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
    Non-critical dependency trên critical path làm failure có vẻ là feature bug (Tikai H25)
  root_cause: >-
    'imports fail' là symptom — root cause là Redis (AI budget check) là hard dependency cho import path, không phải import logic
  do_instead: >-
    Trong Phase 1 (reproduce + document): map mọi external dependency call trong failure path và classify là critical/non-critical. Nếu non-critical dep (AI, analytics, cache) ở trên critical path → ĐÓ LÀ root cause.
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
    Failure 'intermittent/random' trong multi-user system trace về global mutable state (Apollos H-05, StatusBus)
  root_cause: >-
    global broadcast bus làm failures appear non-deterministic — session của user A ngẫu nhiên nhận wrong data
  do_instead: >-
    Trước khi investigate individual components cho 'random' failures: grep for module-level variables, singletons, global dicts/maps — bất kỳ shared state nào là suspect.
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
    Pre-mortem accuracy ~40% về finding count nhưng HIGH về finding type (Tikai [M.EP], Apollos pre-mortem)
  root_cause: >-
    Pre-mortem predict 'worker crash → stuck file' → H5 confirm đúng bug đó
  do_instead: >-
    Luôn run pre-mortem trước debugging session. Type of failure nó predict thường đúng kể cả khi specific mechanism sai. Dùng nó để generate Phase 1 hypotheses.
