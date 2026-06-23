# Subagent Evidence Tiers

Delegated observation is not direct observation.
A parent agent must not treat a subagent report as T1 unless the parent directly verifies the artifact or raw output.

| Subagent claim | Default tier | Upgrade path |
|---|---|---|
| "tests pass" | T3 | T1 only when parent re-runs the command or directly reads raw output showing pass/fail counts and exit code |
| "diff contains X" | T3 | T1 for the mechanical fact only when parent inspects the diff |
| "security review passed" | T3 | T2 if an independent judge/different context validates; broad safety claims rarely become T1 |
| "implementation complete" | T3/T4 | T1/T2 only after parent verifies completion checklist, diff, and required evidence |
| "I fixed the bug" | T3 | T1 when parent verifies fix anchor, original symptom, and relevant tests |

Use claim grammar when summarizing subagent evidence:

```text
CLAIM: <what the subagent asserted>
EVIDENCE: T3 — subagent report only
SOURCE: <subagent summary or artifact>
SCOPE: Delegated report, not direct verification
RESIDUAL RISK: Parent has not verified raw output/diff/runtime behavior
```
