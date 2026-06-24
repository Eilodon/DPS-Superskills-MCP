---
name: complexity-gate
description: Use before any software-development task or skill-applicable workflow — classifies task complexity/risk into C0-C4, selects the minimum required Super Skills, preserves evidence discipline across all tiers, and prevents both under-use and over-use of ceremony.
---

# Complexity-Gate — Proportional Rigor Router

**Register: DISCIPLINE** — runs before the rest of the registry for software-development tasks.
**Goal:** Choose how much rigor is required without weakening the core invariants.
**Core principle:** compressed rigor is allowed; skipped rigor is not.

**Announce:** "Using complexity-gate to select the right Super Skills tier."

---

## Score the Task

Score each input 0-3.

| Input | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Integration points | local only | one module boundary | external service/API | auth/payment/PII/compliance boundary |
| Data sensitivity | none | non-sensitive app data | user/business-critical data | PII/secrets/payment/compliance |
| Irreversibility | no persisted effect | code-only revert | migration/backfill/config rollout | irreversible user/data/customer impact |
| Blast radius | one file/local | one module | user-facing service | cross-service/production-wide |
| Ambiguity | exact task | minor unknowns | multiple design choices | unclear intent/spec |

Total score routes the tier:

```text
C0: 0-2   Direct/minimal
C1: 3-4   Bounded local change
C2: 5-7   Feature or behavior change
C3: 8-10  Production/multi-component
C4: 11+   Critical/high-assurance
```

If any single input is 3, consider raising at least to C3 unless the scope is provably isolated.

---

## Tier Policy

### C0 — Direct / Minimal
Required:
- answer or inspect directly;
- do not make T4 completion claims;
- verify factual/code claims when possible.

### C1 — Bounded Local Change
Required:
- declare proof mode (`tdd-verified`);
- run `verification-before-completion` before success claim;
- run `pattern-globalize` if a bug was fixed.

### C2 — Feature / Behavior Change
Required:
- `brainstorming` lite;
- proof mode;
- `writing-plans` lite;
- `verification-before-completion`;
- mini ADR if a decision, contract, invariant, or behavior changed;
- `pattern-globalize` for bug fixes.

### C3 — Production / Multi-Component
Required:
- `domain-alignment` if project/domain is new;
- `brainstorming`;
- DPS when the spec is non-trivial;
- `audit-design`;
- `writing-plans` + `task-risk-score`;
- `specialist-review`;
- `verification-before-completion`;
- `adr-commit`;
- `knowledge-compound`.

### C4 — Critical
Required:
- all C3 gates;
- independent review when available;
- `privacy-secrets-gate` when data sensitivity is 2 or 3, or secrets/PII/payment/regulated data may appear;
- `release-readiness` before merge/deploy/traffic;
- MIGRATION lens for data/schema changes;
- rollback, observability, and post-deploy evidence.

---

## Spec Requirements by Tier

| Tier | Spec requirement |
|------|-----------------|
| C0 | No spec needed. Task description is sufficient. |
| C1 | Inline spec: 3-5 bullet points in task description. No lifecycle. |
| C2 | Lightweight spec: PROBLEM + SOLUTION + ACCEPTANCE CRITERIA. Single state: DRAFT → DONE. |
| C3 | Standard spec: DRAFT → APPROVED → LIVING-SPEC. Run brainstorming with full checklist including Step 7b (DPS SYSTEM INTENT). |
| C4 | Full lifecycle. Mandatory sign-off before each phase transition. All SYSTEM INTENT fields required. |

C0-C2 tasks should not use the full DPS spec lifecycle — proportional ceremony prevents adoption drag.

---

## Invariants Across All Tiers

Never skip these:

```text
No unverified completion claim.
No bug fix without checking bug class.
No architectural/contract decision without a record.
No repeated failure without systematic-debugging/spec-conflict stop.
No sensitive-data change without `privacy-secrets-gate` when data sensitivity is 2 or 3.
No real learning lost after a cycle.
```

---

## Output

```text
COMPLEXITY GATE
Scores: integration=<0-3>, data=<0-3>, irreversibility=<0-3>, blast=<0-3>, ambiguity=<0-3>
Tier: C0|C1|C2|C3|C4
Spec tier: none|inline|lightweight|standard|full
Required skills:
Optional skills:
Reasoning:
Evidence constraints:
```

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- New entries should follow shared/gotcha-schema.md -->
