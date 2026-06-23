# Quickstart: Team / C2 Feature Rigor

Scenario: add a user-facing behavior that changes one service and one API response, but does not touch PII, auth, payments, or deployment state.

## 1. Complexity gate

```text
Scores: integration=1, data=1, irreversibility=1, blast=2, ambiguity=1
Tier: C2
Required skills: brainstorming-lite, tdd-verified, writing-plans-lite, verification-before-completion, mini ADR if behavior/contract changes
```

## 2. Brainstorming-lite

Capture:

```text
User intent:
Acceptance criteria:
Out of scope:
Known assumptions, labeled T4:
```

## 3. Mini plan

Use `writing-plans` lite:

```text
Files to touch:
Tests to add:
Proof mode:
Rollback/compatibility note:
```

## 4. Proof-first implementation

Default proof mode:

```text
PROOF MODE: TEST_FIRST
```

Add tests for the new response behavior before implementation.

## 5. Decision capture

If API response shape or invariant changes, add a mini ADR:

```text
Decision:
Reason:
Confidence:
Volatility:
Last confirmed:
Residual risk:
```

## 6. Verify and merge-ready claim

Run targeted tests plus any impacted suite.

```text
CLAIM: The new response behavior is implemented and verified for the C2 scope.
EVIDENCE: T1 — targeted API tests and affected service tests passed in current session.
SOURCE: command outputs.
SCOPE: Verifies expected API behavior and no regression in affected service tests; does not prove production rollout readiness.
RESIDUAL RISK: No production traffic or observability validation required at C2.
```
