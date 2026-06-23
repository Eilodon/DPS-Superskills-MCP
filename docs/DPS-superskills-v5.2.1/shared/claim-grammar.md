# Claim Grammar

Use this schema whenever making, storing, or returning a completion/fix/review claim.
The goal is to make evidence discipline visible and auditable, not merely internal.

```text
CLAIM: <what is being asserted>
EVIDENCE: <T1|T2|T3|T4> — <why this tier applies>
SOURCE: <command, file:line, CI job, raw output, review artifact, or direct observation>
SCOPE: <what this evidence proves and what it does not prove>
RESIDUAL RISK: <remaining T3/T4 assumptions, missing coverage, or unverified paths>
```

## Rules

- T4 is never evidence. If the only support is T4, write `ASSUMED`, not `VERIFIED`.
- Every completion claim requires T1 or T2 evidence.
- Evidence must be fresh enough for the claim being made. Stale evidence must be revalidated or labeled.
- Subagent reports are not automatically T1. See `shared/subagent-evidence.md`.
- The `SCOPE` line must name the boundary of the evidence. Tests passing for one path do not prove operational readiness.

## Compressed form

When token budget is constrained, use one line:

```text
CLAIM <x> | EVIDENCE T1/T2 <source> | SCOPE <boundary> | RISK <remaining>
```
