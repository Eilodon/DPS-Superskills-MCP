---
name: verification-before-completion
description: Use before claiming work is complete, fixed, passing, or done — requires running verification commands and producing fresh evidence before any success claim. Evidence before assertions, always.
---

# Verification Before Completion

**Register: DISCIPLINE** — Iron Law applies. Non-negotiable.

**Core principle:** Claiming work is complete without verification is dishonesty, not efficiency.

**Violating the letter of this rule is violating its spirit.**

---

## The Iron Law

```
NO COMPLETION CLAIM WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

---

## The Gate

```
BEFORE any success claim or completion statement:

1. IDENTIFY   What command proves this claim?
2. RUN        Execute fresh. Full output. Do not skip.
3. READ       Full output. Exit code. Failure count.
4. ANCHOR     Record: Evidence Anchor = command + result + timestamp
5. VERIFY     Does output confirm the claim?
              NO  → state actual status with evidence
              YES → state claim WITH evidence attached
6. CLAIM      Only now make the claim

Skipping any step = lying, not verifying.
```

---

## Evidence Tiers (VHEATM integration)

Not all evidence is equal. Label your evidence:

```
T1 — Direct observation this session (ran command, read output)          → MANDATORY finding
T2 — External validation (CI passed, peer review confirmed)              → REQUIRED finding
T3 — Indirect evidence (related test passed, pattern match)              → MEDIUM confidence
T4 — Heuristic / inference ("should work", "looks correct")             → NOT evidence
```

**T4 is never evidence.** Claims backed only by T4 are ASSUMED, not verified.
Any completion claim requires T1 or T2.

---

## Common Claims and What They Require

| Claim | Requires | Not Sufficient |
|---|---|---|
| "Tests pass" | Run test command → 0 failures (T1) | Previous run, "should pass" (T4) |
| "Bug fixed" | Test original symptom → passes (T1) + Fix Anchor | Code changed (T4) |
| "Linter clean" | Run linter → 0 errors (T1) | Partial check (T3) |
| "Build succeeds" | Run build → exit 0 (T1) | Linter passed (T3) |
| "Requirements met" | Line-by-line checklist (T1) | Tests passing (T3) |
| "Agent completed" | Inspect VCS diff → verify changes (T1) | Agent reports "success" (T4) |
| "Pattern globalized" | Grep run + results reviewed (T1) | "I checked similar code" (T4) |

---

## Fix Anchor Protocol (VHEATM integration)

For every claimed fix, before marking resolved:

```
Fix Anchor: <file>:<line> — <description of change>
Verification: re-read <file>:<line-range> after fix
Evidence: T1 — observed correct behavior in code
```

Steps:
1. Make the fix
2. Document Fix Anchor: exact file and line
3. Re-read that section of the file (not from memory — actually read)
4. Then run tests
5. Then claim fixed

**Skipping re-read = ASSUMED, not VERIFIED.**
If Fix Anchor is ASSUMED → label the fix as T3, not T1.

After fix → **mandatory**: trigger `pattern-globalize` for the bug class.

---

## Integration with tdd-verified

This skill gates the end of every TDD cycle:

```
RED evidence:      test failure output documented
GREEN evidence:    test pass output + suite count documented
REFACTOR evidence: suite still green after refactor
COMPLETE gate:     this skill — verification-before-completion
```

Do not claim a TDD cycle complete without running this gate.

---



## Subagent Evidence Rule

Delegated observation is not direct observation. A subagent report is T3 by default unless the parent agent verifies the artifact or raw output directly.

| Subagent claim | Default tier | Upgrade path |
|---|---|---|
| "tests pass" | T3 | T1 only when parent re-runs command or reads raw output with pass/fail counts and exit code |
| "diff contains X" | T3 | T1 for that mechanical fact only when parent inspects the diff |
| "security review passed" | T3 | T2 if independent judge/different context validates; broad safety rarely becomes T1 |
| "implementation complete" | T3/T4 | T1/T2 only after parent verifies checklist, diff, and required evidence |

See `shared/subagent-evidence.md`.

---

## Red Flags — Stop

- Using "should", "probably", "seems to", "I think"
- Expressing satisfaction before running verification ("Done!", "Fixed!", "Perfect!")
- About to commit without verification output
- Trusting agent success reports without VCS diff check
- Relying on a previous run (not this message)
- Tired and wanting work to be over
- "I've verified this before" (stale — re-verify)

---

## Rationalization Prevention

| Excuse | Reality |
|---|---|
| "Should work now" | RUN the command |
| "I'm confident" | Confidence ≠ T1 evidence |
| "Agent said success" | Verify with VCS diff independently |
| "I'm tired" | Exhaustion is not an exception |
| "Partial check is enough" | T3 ≠ T1. Partial proves nothing complete |
| "Different wording, rule doesn't apply" | Spirit over letter — applies to implications of success |

---

## Evidence Format for Completion Claims (Claim Grammar)

```
CLAIM: <what is being asserted>
EVIDENCE: <T1|T2|T3|T4> — <why this tier applies>
SOURCE: <exact command, file:line, raw output, CI/review artifact>
SCOPE: <what this evidence proves and what it does not prove>
RESIDUAL RISK: <remaining T3/T4 assumptions, missing coverage, or unverified paths>
```

This record goes in commit message, ADR Part 7 (Evidence), or code review response.

---

## The Bottom Line

Run the command. Read the output. Document the anchor. Then claim the result.
No shortcuts. No exceptions.


## Pressure Tests — Common Rationalizations

- **"Tôi đã chạy tests lúc nãy và pass"** → Evidence Anchor = fresh run trong message này. "Lúc nãy" là T4. Chạy lại ngay bây giờ.
- **"Codebase này tôi biết rõ, chắc chắn hoạt động"** → Prior knowledge ≠ evidence. Expert bias là lý do thường xuyên nhất bỏ sót regressions. Run verification.
- **"Tests pass = done"** → Tests cover gì? Operational failure modes, Redis outage, worker crash — không có trong unit tests. "Tests pass" là necessary, không phải sufficient.
- **"Comment/README nói nó work"** → Comments là T4. Code là T1. Verify against code, không phải against documentation.

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
    Code comment mô tả intended behavior, không phải implementation thực tế — verify 'sai thứ' (Tikai H5, QBR=8, confirmed HIGH BUG)
  root_cause: >-
    comment nói 'only block COMPLETED imports' nhưng code block ALL non-terminal states bao gồm 'processing' → worker crash = file stuck mãi mãi
  do_instead: >-
    Verify code against code, không phải comment against code. Comments là T4 evidence. Đọc actual conditional logic, không phải comment bên trên nó.
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
    README feature claims là stubs hoặc weaker implementations — G.CDOC apply cho README là cần thiết (Apollos, 3 MANDATORY findings)
  root_cause: >-
    'human escalation path' → hardcoded dead URL; 'motion-aware blocking' → keyword enum; 'replay-backed SSE' → global broadcast. README review được treat như documentation review, không phải evidence verification
  do_instead: >-
    Trước khi claim completion cho feature được describe trong README: treat README claims như hypotheses. Verify từng cái against actual code. G.CDOC applies to README, không chỉ ADRs.
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
    '164 tests passing' tạo false confidence — operational gaps (worker crash, Redis outage, seed missing) không có trong test suite (Tikai [M.BA])
  root_cause: >-
    test coverage được đọc là 'feature correctness = good' mà không check cái tests KHÔNG cover
  do_instead: >-
    Sau khi cite test pass rate: explicitly hỏi 'failure modes nào KHÔNG có trong test suite?' Operational paths (dependency outage, crash recovery, config missing) bị undertest một cách có hệ thống.
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
