---
name: release-readiness
description: Use before merge, deploy, release branch cut, production traffic enablement, migration, or feature-flag rollout — verifies rollback, smoke tests, observability, data impact, dependency readiness, and post-deploy evidence so code-complete is not mistaken for release-ready.
---

# Release-Readiness — Operational Gate Before Production

**Register: DISCIPLINE**
**Goal:** Distinguish code complete from release ready.
**Core principle:** production failures often happen during rollout, not implementation.

**Announce:** "Using release-readiness to verify operational safety before release."

---

## Required for

- C3/C4 tasks before merge or deploy;
- migrations or data backfills;
- feature flag enablement;
- external integration rollout;
- payment, auth, PII, secrets, payment/regulated data, compliance, or irreversible changes.

---

## Checklist

```text
[ ] Rollback path exists and is realistic.
[ ] Feature flag / kill switch considered.
[ ] Migration reversible, backed up, or explicitly accepted as irreversible.
[ ] Smoke test commands defined.
[ ] Observability exists for the changed behavior.
[ ] Alerts or watch signals link to ADR volatility/assumptions.
[ ] Post-deploy verification planned.
[ ] Owner/on-call/runbook identified.
[ ] External dependencies checked.
[ ] User/data impact assessed.
[ ] `privacy-secrets-gate` completed when data sensitivity is 2/3, secrets/PII/payment/regulated data may appear, or external disclosure is planned.
[ ] Known residual risk is labeled with claim grammar.
```

If any C4 item is missing, do not release until explicit acceptance is recorded.

---

## Output

```text
RELEASE READINESS
Status: READY | READY_WITH_ACCEPTED_RISK | NOT_READY
Evidence:
Rollback:
Smoke tests:
Observability:
Post-deploy verification:
Residual risk:
```

Completion language must distinguish:
- `code complete`;
- `verified locally`;
- `release ready`;
- `deployed and verified`.

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- New entries should follow shared/gotcha-schema.md -->
