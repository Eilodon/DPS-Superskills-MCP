# Epistemic Health and Staleness Lifecycle

Evidence has a lifecycle. A claim can be true when recorded and unsafe to rely on later.
Use this reference when running `framework-doctor`, `kb-query`, `adr-commit`, `dps-promote`, or release gates.

Lifecycle:

```text
capture -> verify -> use -> age -> revalidate -> downgrade/retire
```

## Staleness checks

- ADRs: compare `LAST CONFIRMED` against `VOLATILITY`.
  - STABLE: review when touched or before major architecture change.
  - WATCHFUL: review before related release or after external dependency change.
  - VOLATILE: review before each implementation phase or production release.
- Gotchas: check `status`, `scope`, `last_seen`, and `retire_if`.
- Assumptions: any accepted T4 item must have an owner, validation target, or explicit expiry.
- Docs: README/install/spec claims must be verified against implementation or labeled T4.
- Calibration: QBR/M.AT should be revisited after at least five cycles or after severe misprediction.

## Actions

- REVALIDATE: gather fresh T1/T2 evidence and update `LAST CONFIRMED` / `last_seen`.
- DOWNGRADE: change status/confidence when evidence is stale but not contradicted.
- RETIRE: mark stale knowledge inactive when it no longer applies.
- ESCALATE: if stale evidence gates a C3/C4 task or release, stop and resolve before proceeding.
