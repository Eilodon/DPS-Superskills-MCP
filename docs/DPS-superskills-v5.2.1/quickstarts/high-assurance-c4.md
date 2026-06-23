# Quickstart: High-Assurance / C4 Workflow

Scenario: change payment retry behavior that touches external provider payloads, customer identifiers, logs, and a database migration.

## 1. Complexity gate

```text
Scores: integration=3, data=3, irreversibility=2, blast=3, ambiguity=1
Tier: C4
Required skills: all C3 gates + independent review + privacy-secrets-gate + release-readiness + MIGRATION lens + rollback/observability/post-deploy evidence
```

## 2. Domain alignment

Run `domain-alignment` if this domain is new or stale:

```text
Actors:
Payment provider terms:
Customer data classes:
Forbidden assumptions:
External dependencies:
```

## 3. DPS design path

Use:

```text
brainstorming → dps-init → audit-design → dps-promote → writing-plans → task-risk-score
```

DPS must define contracts once, reference them from BLUEPRINT, and record confidence/volatility/watch signals.

## 4. Privacy/secrets gate

Run `privacy-secrets-gate` before external review or implementation completion:

```text
Data classes touched: PII, PAYMENT, SECRET?
Disclosure paths: logs, telemetry, provider API, prompts/tools, exports/backups
Scans run: git diff secret grep, optional gitleaks/trufflehog
Status: PASS | PASS_WITH_ACCEPTED_RISK | BLOCKED
```

## 5. Proof-first implementation

Likely proof modes:

```text
TEST_FIRST for retry behavior
MIGRATION_DRY_RUN for schema/backfill
CONFIG_SMOKE for provider/env configuration
```

## 6. Specialist review

Run `specialist-review` with relevant lenses:

```text
STRIDE / OWASP for trust boundary and API surface
CPT for write chain
MIGRATION for schema/backfill
TEMPORAL for retry/worker behavior
```

Subagent or independent judge reports are not T1 until raw evidence is verified by parent.

## 7. Release readiness

Before merge/deploy/traffic:

```text
Rollback:
Feature flag/kill switch:
Smoke tests:
Observability and ADR watch signals:
Post-deploy verification:
Accepted residual risk:
```

## 8. Epistemic health and KB update

Run:

```bash
python3 tools/epistemic_health_check.py . --record-run --strict
python3 tools/build_kb_index.py .
```

After merge/cycle, record:

```bash
python3 tools/epistemic_health_check.py . --record-cycle
```

## 9. Completion claim

```text
CLAIM: Payment retry change is release-ready for the C4 scope.
EVIDENCE: T1/T2 — proof-mode tests, migration dry-run, privacy/secrets gate, specialist review evidence, release-readiness, and epistemic-health check completed.
SOURCE: command outputs, review artifacts, ADR evidence section.
SCOPE: Verifies implementation, data handling, migration safety, and release plan; post-deploy behavior still requires live verification.
RESIDUAL RISK: List accepted rollout and provider-behavior risks with watch signals.
```
