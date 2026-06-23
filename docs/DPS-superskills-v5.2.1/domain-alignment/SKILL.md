---
name: domain-alignment
description: Use at the start of a new project, unfamiliar domain, or new product area before brainstorming — creates or updates docs/superskills/CONTEXT.md with vocabulary, actors, invariants, sensitive data, external dependencies, forbidden assumptions, success/failure semantics, and synonyms for KB search.
---

# Domain-Alignment — Build the Project Context Layer

**Register: TECHNIQUE**
**Goal:** Establish shared domain language and non-negotiable context before design begins.
**Constraints:** Label every unsourced assumption as T4/ASSUMED. Do not let inferred vocabulary become verified truth without evidence.

**Announce:** "Using domain-alignment to establish CONTEXT.md before brainstorming."

---

## Process

1. Read `docs/superskills/CONTEXT.md` if it exists. If missing, create it from `bootstrap-templates/CONTEXT.seed.md` or the scaffold below.
2. Capture or update:
   - ubiquitous language and domain-specific meanings;
   - actors, customers, operators, and external systems;
   - business invariants and anti-requirements;
   - sensitive data, PII, secrets, payment/compliance concerns;
   - external dependencies and operational assumptions;
   - forbidden assumptions the agent must not make;
   - success/failure semantics;
   - synonyms / alias map for `kb-query`.
3. For each entry, record a source when possible: user confirmation, code, ADR, spec, audit, production incident.
4. Mark unsourced items as `T4/ASSUMED` with a validation target.
5. Output a Context Alignment Summary before invoking `brainstorming`.

---

## CONTEXT.md Sections

```markdown
# CONTEXT.md — Domain Knowledge

## Ubiquitous Language
- **term**: definition. Source: <user/code/ADR/spec/audit> Evidence: T1|T2|T3|T4

## Actors and Systems
- <actor/system>: role, boundary, data touched, operational responsibility.

## Business Invariants
- <invariant>: what must always remain true. Enforced by: <component/process>. Evidence: <tier/source>

## Sensitive Data and Trust Boundaries
- <data/boundary>: classification, allowed handling, forbidden handling.

## External Dependencies
- <dependency>: owner, failure modes, timeout/fallback expectations, volatility.

## Forbidden Assumptions
- <assumption agent must not make> — why.

## Success / Failure Semantics
- Success means: ...
- Failure means: ...
- Partial success means: ...

## Synonyms / Alias Map
- auth: authentication, token, session, credential, permission
- worker: async job, queue, background task, temporal
- release: deploy, rollout, enable traffic, cutover
- migration: schema change, backfill, data move

## Domain Gotchas
- Use `shared/gotcha-schema.md` for new entries.
```

---

## Output

```text
CONTEXT ALIGNMENT SUMMARY
New/updated terms:
Sensitive boundaries:
External dependencies:
Forbidden assumptions:
T4/ASSUMED items needing validation:
Next: brainstorming | skill-init | kb-query
```

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- New entries should follow shared/gotcha-schema.md -->
