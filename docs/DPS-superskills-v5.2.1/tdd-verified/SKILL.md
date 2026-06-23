---
name: tdd-verified
description: Use when implementing any feature, bugfix, migration, config change, or doc claim that needs proof — requires declaring a proof mode before implementation and preserves RED-GREEN-REFACTOR as the default for behavior code.
---

# TDD-Verified — Proof-First Development with Evidence Anchors

**Register: DISCIPLINE** — Iron Laws apply. Non-negotiable.

This skill enforces proof-first development. For behavior code and bug fixes, the default proof mode is RED-GREEN-REFACTOR with VHEATM evidence anchors at every gate. For migrations, config, docs, or spikes, declare an alternate proof mode before implementation.

**Core principle:** Evidence before claims. If you didn't watch the test fail, you don't
know if it tests the right thing. If you didn't run verification, you cannot claim it passes.

**Violating the letter of these rules is violating their spirit.**

---

## The Iron Laws

```
1. NO IMPLEMENTATION WITHOUT A DECLARED PROOF MODE
2. NO BEHAVIOR CODE WITHOUT A FAILING TEST FIRST
3. NO COMPLETION CLAIM WITHOUT FRESH VERIFICATION EVIDENCE
4. NO FIX CLAIM WITHOUT A FIX ANCHOR (file:line re-read after change)
```

For behavior code, writing code before the failing test means delete it and start over. For other work, the declared proof mode defines the evidence gate.

---



## Proof Mode Declaration

Declare one before implementation:

| Proof mode | Use when | Required evidence |
|---|---|---|
| TEST_FIRST | behavior code, feature logic, bug fixes | failing test observed first, then passing test/suite |
| MIGRATION_DRY_RUN | schema/data migration, backfill | dry-run output, backup/rollback or accepted irreversibility, checksum/count plan |
| CONFIG_SMOKE | config, routing, deployment settings | config diff, smoke command, environment-specific verification |
| DOC_SOURCE_CHECK | README/spec/docs claims | source cross-check against code/spec/ADR; label unverified claims T4 |
| SPIKE_THROWAWAY | exploratory prototype | timeboxed learning, explicit throwaway status; cannot ship until converted to another proof mode |

No completion claim is allowed until the proof mode has T1/T2 evidence.

---

## RED-GREEN-REFACTOR with Evidence Gates

### RED — Write Failing Test

Write one minimal test showing exactly what should happen.

```
✅ Clear name: "rejects empty email address"
✅ Tests behavior: assert result.error == 'Email required'
✅ Real code: no mocks unless unavoidable
✅ One thing: no "and" in test name
```

**Evidence gate — verify RED:**
```bash
# Run test. Must FAIL. Document the failure output.
<test command> <test file>::<test name>

Evidence Anchor: test fails with "<exact failure message>"
```

If test passes immediately → you're testing existing behavior. Fix test.
If test errors → fix error, re-run until failure is intentional.

**You cannot proceed to GREEN without documented failure evidence.**

### GREEN — Write Minimal Code

Write the simplest code that makes the test pass. Nothing more.

YAGNI: no extra parameters, no future-proofing, no "while I'm here" changes.

**Evidence gate — verify GREEN:**
```bash
# Run test. Must PASS. Run full suite. Must stay green.
<test command>

Evidence Anchor: test passes — N/N suite green
```

If test fails → fix code (not test).
If other tests break → fix immediately before proceeding.

**You cannot proceed to REFACTOR without documented passing evidence.**

### REFACTOR — Clean Up

After GREEN only: remove duplication, improve names, extract helpers.
Keep tests green. Add zero new behavior.

**Evidence gate — verify REFACTOR:**
```bash
<test command>
Evidence Anchor: suite still N/N green after refactor
```

---

## Fix Anchor Requirement (VHEATM integration)

For every bug fix, before claiming "fixed":

```
Fix Anchor: <file>:<line> — <one-line description of change>
Action: re-read that file section AFTER the fix
Status: VERIFIED | ASSUMED
```

**ASSUMED** = you didn't re-read the file. Mark explicitly.
**VERIFIED** = you re-read after the fix. Required before marking fixed.

After fix → trigger `pattern-globalize`: does this bug class exist elsewhere?

---

## Verification Checklist

Before marking ANY work complete:

- [ ] Proof mode declared before implementation
- [ ] Every new behavior/function/method uses TEST_FIRST unless another proof mode is explicitly justified
- [ ] Watched each test FAIL before implementing (have failure output)
- [ ] Each test failed for expected reason — feature missing, not typo
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass — ran full suite, have output
- [ ] Fix Anchor documented for every bug fix — re-read performed
- [ ] `pattern-globalize` run for every confirmed bug
- [ ] `verification-before-completion` checked before claiming done

Cannot check all boxes? You skipped proof-first discipline. For behavior code, start over with TDD. For other modes, stop and gather the required proof evidence.

---

## Common Rationalizations — All Rejected

| Excuse | Reality |
|---|---|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Tests after achieve same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Deleting work is wasteful" | Sunk cost. Keeping unverified code is technical debt. |
| "I'm confident it works" | Confidence ≠ evidence. Run verification. |
| "Fix Anchor is overkill" | Re-reading takes 30 seconds. Skipping it ships bugs. |

## Red Flags — Stop and Start Over

- Code written before test
- Test passes immediately after writing
- Can't show test failure output
- "Should work now" without running verification
- Fix claimed without Fix Anchor re-read
- Completion claimed without evidence
- Any variation of "probably", "seems to", "should"

**For behavior code, these mean: delete, start over with TDD. For non-behavior work, stop and re-enter through the declared proof mode.**


## Pressure Tests — Common Rationalizations

Những reasoning patterns dẫn đến skip skill này. Nhận ra chúng. Reject chúng.

- **"Tôi sẽ viết test sau khi code xong để nhanh hơn"** → Không có "sau." Code trước test = không có failing test = không biết test đang test đúng thứ gì. Delete và start over.
- **"Feature này quá đơn giản để cần test trước"** → Simplicity bias. Đơn giản nhất là lúc TDD dễ nhất. Nếu không thể viết test trước, design chưa đủ rõ.
- **"Test đang pass rồi nên không cần chạy lại"** → Evidence Anchor yêu cầu fresh run trong message này. "Was passing" ≠ "is passing." Chạy lại.
- **"Mock quá phức tạp nên skip"** → Mock complexity là design smell. Refactor interface trước. Nếu không thể test, không thể implement đúng.

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->
<!-- DO NOT pre-populate with speculation — real observations only -->
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
