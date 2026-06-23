---
name: epistemic-health-check
description: Use before major releases, after repeated cycles, or when relying on old ADRs, Gotchas, assumptions, QBR/M.AT calibration, or compound KB entries — automates staleness checks so evidence that was once true is revalidated, downgraded, retired, or escalated instead of silently trusted.
---

# Epistemic-Health-Check — Evidence Staleness Automation

**Register: DISCIPLINE**
**Goal:** Detect when previously valid knowledge is stale, underspecified, or unsafe to rely on.
**Core principle:** evidence has a lifecycle: capture → verify → use → age → revalidate → retire.

**Announce:** "Using epistemic-health-check to detect stale knowledge before relying on old evidence."

---

## Run

```bash
python3 tools/epistemic_health_check.py .
```

Cadence automation:

```bash
# At the end of each ADR/knowledge-compound cycle
python3 tools/epistemic_health_check.py . --record-cycle

# When performing the periodic health check or before C3/C4 release
python3 tools/epistemic_health_check.py . --record-run --strict
```

The script stores cadence state in `docs/superskills/.epistemic-health-state.json` by default.

Pass a project root containing `docs/superskills/`. If the KB does not exist, the script exits cleanly and reports that there is nothing to check.

---

## Trigger

Run this skill when any of these are true:

- before a major release or C3/C4 task;
- after 5+ cycles using the same KB, enforced by `--record-cycle` / `--record-run`;
- when an ADR has `VOLATILITY: WATCHFUL` or `VOLATILITY: VOLATILE`;
- when a Gotcha has old `last_seen` or a `retire_if` condition;
- when relying on old `ASSUMED`, T4, or README/install/spec claims;
- after external API, dependency, schema, or product-domain changes;
- when `framework-doctor` reports drift;
- before declaring that historical evidence still applies.

---

## What the script checks

```text
[ ] ADR LAST CONFIRMED freshness vs VOLATILITY
[ ] unresolved ASSUMED/T4 claims
[ ] Gotchas with status/last_seen/retire_if fields
[ ] stale or missing QBR/M.AT calibration updates
[ ] stale docs/install/version references in framework mode
[ ] cadence due: cycles since last health check or days since last recorded run
```

Default freshness windows:

```text
VOLATILE: 30 days
WATCHFUL: 90 days
STABLE: 180 days
UNKNOWN/no volatility: 120 days
```

---

## Output

```text
EPISTEMIC HEALTH
Status: PASS | WARN | FAIL
Stale ADRs:
Stale Gotchas:
Unresolved assumptions:
Calibration issues:
Recommended action:
```

A WARN does not always block work, but it must be represented in claim grammar as residual risk.

---

## Required action by severity

| Finding | Action |
|---|---|
| Stale C3/C4 ADR | Revalidate or downgrade confidence before release |
| Stale Gotcha | Mark WATCH/INACTIVE or refresh `last_seen` with evidence |
| Unresolved T4 assumption | Verify, explicitly carry as residual risk, or block if critical |
| Missing QBR calibration after 5+ cycles | Create/update qbr-calibration entry |
| Drift in framework docs | Run `framework-doctor` and fix before release |

---

## Completion Claim

Use claim grammar:

```text
CLAIM: Historical knowledge is safe to rely on for this task.
EVIDENCE: T1 — ran `python3 tools/epistemic_health_check.py .` and reviewed findings.
SOURCE: command output.
SCOPE: Verifies staleness signals in docs/superskills and structured Gotchas; does not prove external reality unless sources were revalidated.
RESIDUAL RISK: List any WARN findings or assumptions carried forward.
```

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- New entries should follow shared/gotcha-schema.md -->
