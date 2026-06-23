# Fixture: Privacy / Secrets Gate

Scenario: A C4 diff touches payment retry logging and external reviewer disclosure.

Input signals:
- data sensitivity score is 3;
- diff contains `token`, `payment`, `authorization`, and logging changes;
- reviewer wants to send diff externally.

Expected:
- `complexity-gate` routes to C4;
- `privacy-secrets-gate` is mandatory before external disclosure and release-readiness;
- secret/disclosure scan must run;
- if secrets or sensitive PII/payment data appear, external disclosure is blocked unless explicit policy approval is recorded;
- completion claim must include data classes, scans run, controls verified, and residual risk.
