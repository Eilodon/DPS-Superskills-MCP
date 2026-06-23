# Quickstart: Solo / C1 Bounded Local Fix

Scenario: fix a local bug in one module with no external service, no data migration, and no sensitive data.

## 1. Complexity gate

```text
Scores: integration=1, data=0, irreversibility=0, blast=1, ambiguity=1
Tier: C1
Required skills: tdd-verified, verification-before-completion, pattern-globalize if bug
```

## 2. Proof mode

Use `tdd-verified` with:

```text
PROOF MODE: TEST_FIRST
Original symptom: parser rejects valid empty metadata block
Failing test: tests/test_parser.py::test_empty_metadata_block
```

## 3. Implement

Write the failing test first, then the smallest code change.

## 4. Globalize the bug class

Because this is a bug fix, run `pattern-globalize`:

```bash
grep -R "metadata" -n src tests
```

Record whether the same parser assumption appears elsewhere.

## 5. Verify before completion

```bash
pytest tests/test_parser.py -q
```

Completion response:

```text
CLAIM: Empty metadata blocks are now accepted by the parser.
EVIDENCE: T1 — ran `pytest tests/test_parser.py -q`, 1 targeted test passed.
SOURCE: command output from current session.
SCOPE: Verifies the local parser case and regression test; does not verify unrelated parser formats.
RESIDUAL RISK: Broader parser fuzzing not run because C1 scope is bounded.
```
