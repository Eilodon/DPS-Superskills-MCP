# Super Skills One-Page Cheatsheet

## First move

```text
Software-development task? → run complexity-gate first.
```

## Tiers

```text
C0  Direct/minimal: no T4 claims.
C1  Local bounded fix: proof mode + verification + pattern-globalize if bug.
C2  Feature behavior: brainstorming-lite + plan-lite + proof mode + verification + mini ADR if decision changes.
C3  Production/multi-component: DPS/audit/plan/review/ADR/knowledge loop.
C4  Critical: C3 + privacy-secrets-gate + release-readiness + independent review where possible + migration/privacy gates.
```

## Evidence tiers

```text
T1 direct observation this session
T2 external validation
T3 indirect/partial evidence
T4 assumption — never evidence
```

## Proof modes

```text
TEST_FIRST
MIGRATION_DRY_RUN
CONFIG_SMOKE
DOC_SOURCE_CHECK
SPIKE_THROWAWAY
```

## Completion grammar

```text
CLAIM:
EVIDENCE:
SOURCE:
SCOPE:
RESIDUAL RISK:
```

## Core commands

```bash
python3 tools/framework_doctor.py .
python3 tools/run_framework_fixtures.py .
python3 tools/build_kb_index.py .
python3 tools/epistemic_health_check.py . --record-run --strict
python3 tools/epistemic_health_check.py . --record-cycle
```

## Never skip

```text
No unverified completion claim.
No bug fix without checking the bug class.
No architectural/contract decision without a record.
No sensitive-data change without privacy/secrets gate.
No release-ready claim without release-readiness evidence.
No old evidence without staleness check when C3/C4 or stale signals apply.
```
