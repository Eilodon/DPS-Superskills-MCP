# DPS Super Skills v5.2 — Automation Hardening Release

This release keeps the existing DPS Super Skills multi-skill bundle format. It does not port the bundle to GPT/OpenAI Skills or any other package layout.

## Focus

v5.2 converts the remaining v5.1 guidance into deterministic automation:

- evidence staleness scanning;
- KB index generation;
- expanded framework doctor coverage;
- executable framework fixture runner.

## New skill

- `epistemic-health-check` — detects stale ADRs, Gotchas, unresolved ASSUMED/T4 claims, QBR/M.AT calibration staleness, and framework doc drift.

## New tools

```bash
python3 tools/epistemic_health_check.py .
python3 tools/build_kb_index.py .
python3 tools/run_framework_fixtures.py .
python3 tools/framework_doctor.py .
```

## What changed from v5.1

- `framework-doctor` now checks automation script syntax, fixture presence, release-doc readiness, broader skill references, and required v5.2 files.
- `kb-query` now invokes `tools/build_kb_index.py` when available and treats `kb-index.md` as generated automation rather than a purely optional manual artifact.
- `knowledge-compound` now calls `tools/epistemic_health_check.py` during evidence staleness review.
- `using-super-skills` registry includes `epistemic-health-check` for stale evidence and C3/C4 release decisions.
- `framework-tests/fixtures/` documents classic failure modes and `tools/run_framework_fixtures.py` provides executable deterministic checks.

## Release evidence template

```text
CLAIM: DPS Super Skills v5.2 automation hardening is complete.
EVIDENCE: T1 — ran framework doctor, fixture runner, epistemic health check, and zip integrity check.
SOURCE: command outputs from release verification.
SCOPE: Verifies framework packaging/hygiene plus deterministic automation for staleness, KB indexing, doctor coverage, and fixtures.
RESIDUAL RISK: Does not prove real-world adoption quality until used across production cycles.
```
