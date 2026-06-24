# CONTRACTS.md — Schema Registry
> **DPS VERSION:** `5.0-template`
> **DPS PROFILE:** `DPS-Standard` *(choose: `DPS-Lite` / `DPS-Standard` / `DPS-Critical`)*
### {{PROJECT_NAME}} · v{{VERSION}} · compatible with: [BLUEPRINT v{{Y}}, ADR v{{Z}}]

> **Golden Rule:** Every type, schema, enum, and constant is defined **EXACTLY ONCE** here.
> BLUEPRINT.md and code **reference** them — do not redefine, do not copy, do not paraphrase.
>
> When there is a conflict between this file and any other file → this file wins.


> **DPS STATUS:** `DRAFT` *(choose: `DRAFT` / `PROOF-READY` / `APPROVED-SSOT` / `IMPLEMENTATION-ACTIVE` / `LIVING-SPEC` / `SUPERSEDED`)*
> **PROMOTED BY:** {{WHO}} · **PROMOTED AT:** {{YYYY-MM-DD}}
> **PROMOTION BASIS:** {{review / stress-test / spike / audit / validation evidence}}
> **CURRENT AUTHORITY:** `DPS` *(default template value)* — if not `DPS`, specify the reason and scope.
>
> **Rule:** `DRAFT` must not be used as an implementation source for agents. Only `APPROVED-SSOT`, `IMPLEMENTATION-ACTIVE`, or `LIVING-SPEC` hold implementation authority.
---

## Table of Contents

1. [Primitive Types & Constants](#1-primitive-types--constants)
2. [Enums](#2-enums)
3. [Core Schemas](#3-core-schemas)
   - [3.X System Invariants](#3x-system-invariants)
4. [Input / Output Contracts](#4-input--output-contracts)
5. [Error Registry](#5-error-registry)
6. [External Contracts](#6-external-contracts)
7. [Naming Conventions](#7-naming-conventions)
8. [Schema Changelog](#8-schema-changelog)
9. [Deprecation Registry](#9-deprecation-registry)
10. [Glossary](#10-glossary)

---

## 1. PRIMITIVE TYPES & CONSTANTS

> Types and constants used throughout the system.
> Agents MUST NOT hard-code these constant values anywhere else.

📝 **FILL-IN**

```
{{CONST_1}} :: {{TYPE}} = {{VALUE}}
  // Reason: {{WHY_THIS_VALUE}}

{{CONST_2}} :: {{TYPE}} = {{VALUE}}
  // Reason: {{WHY_THIS_VALUE}}
```

> **Type notation used in this file:**
> ```
> FieldName :: Type                         — required field
> FieldName :: Type?                        — optional field (nullable)
> FieldName :: List<Type>                   — ordered list
> FieldName :: Map<KeyType, ValueType>      — map / dict
> FieldName :: TypeA | TypeB               — union type (choose one)
> FieldName :: Ref<SchemaName>              — reference to another schema
> FieldName :: Result<OkType, ErrCode>     — success or typed error (no exceptions)
> FieldName :: (TypeA, TypeB, TypeC)       — tuple, order is significant, immutable
> FieldName :: ~ExpressionOrField          — derived/computed from other fields, DO NOT persist to DB
> ```

---

## 2. ENUMS

> All enums are defined here. Do not create inline enums in schemas.

📝 **FILL-IN**

### {{ENUM_1_NAME}}

```
{{ENUM_1_NAME}} ::
  | {{VARIANT_A}}   // {{WHEN_TO_USE_DESCRIPTION}}
  | {{VARIANT_B}}   // {{WHEN_TO_USE_DESCRIPTION}}
  | {{VARIANT_C}}   // {{WHEN_TO_USE_DESCRIPTION}}
```

**Used in:** `{{SCHEMA_A}}`, `{{SCHEMA_B}}`
**Do not use for:** {{EXCLUSION_EDGE_CASE}}

### {{ENUM_2_NAME}}

```
{{ENUM_2_NAME}} ::
  | {{VARIANT_A}}
  | {{VARIANT_B}}
```

**Used in:** `{{SCHEMA}}`

---

## 3. CORE SCHEMAS

> Schemas are ordered from primitive → composite.
> If a schema depends on another schema → the dependent schema must be defined ABOVE it.

📝 **FILL-IN**

---

### {{SCHEMA_1_NAME}}

> {{ONE_LINE_SHORT_DESCRIPTION — what this schema represents in the domain}}
> **Owner:** {{TEAM/PERSON}}
> **Decision origin:** ADR-{{N}} — {{SHORT_ADR_NAME}}
>   *(If no ADR: write `Pre-ADR design` + one sentence reason — this is debt, not an excuse to skip)*
> **External consumer:** {{client/team name if this schema does not have Ref<X> in BLUEPRINT — omit if not applicable}}

```
{{SCHEMA_1_NAME}} :: {
  {{field_1}}  :: {{Type}}                    // {{business_meaning}} — see Glossary: {{TERM}} if using a domain term
  {{field_2}}  :: {{Type}}?                   // {{business_meaning}} — optional because {{reason}}
  {{field_3}}  :: Ref<{{OTHER_SCHEMA}}>        // {{relationship_meaning}}
  {{field_4}}  :: {{ENUM_NAME}}               // {{business_meaning}}
  ~{{field_5}} :: {{Type}}                    // computed from {{field_1}} + {{field_2}}, DO NOT save to DB
}
```

> **Annotation `see Glossary: {{TERM}}`:** When a field comment uses a domain term — link to Glossary Section 10.
> If the term is not yet in the Glossary → add it to the Glossary first. This is a first-class enforcement of Ubiquitous Language.

**Constraints:**
```
INVARIANT: {{field_1}} must not be empty when {{field_4}} == {{VARIANT}}
INVARIANT: {{field_2}} must be present when {{field_3}} != null
RANGE:     {{field_1}}.length ∈ [{{MIN}}, {{MAX}}]
```

**Not to be confused with:** `{{SIMILAR_SCHEMA}}` — differs in {{DIFFERENCES}}

---

### {{SCHEMA_2_NAME}}

> {{SHORT_DESCRIPTION}}
> **Owner:** {{TEAM/PERSON}}
> **Decision origin:** ADR-{{N}} — {{SHORT_ADR_NAME}}
> **External consumer:** {{client/team name if applicable — omit if not}}

```
{{SCHEMA_2_NAME}} :: {
  {{field_1}}  :: {{Type}}
  {{field_2}}  :: List<Ref<{{SCHEMA_1_NAME}}>>
  {{field_3}}  :: Map<string, {{Type}}>
}
```

**Constraints:**
```
INVARIANT: {{field_2}}.length >= 1   // must have at least one item
```

---

### {{SCHEMA_N_NAME}}

📝 Add schemas using the same format. Each schema needs: description, owner, **decision origin (mandatory)**, external consumer annotation (when applicable), field definitions, constraints, disambiguation if needed.

---

## 3.X. SYSTEM INVARIANTS

> Cross-component invariants — constraints involving ≥2 components or ≥2 schemas simultaneously.
> Distinguish from: per-schema INVARIANT (involving only one schema) and
> state machine INVARIANTS in BLUEPRINT Section 4 (involving only state transitions).
>
> Each System Invariant needs: definition, scope (who is involved), and enforcement mechanism (who is responsible for checking).
> This is the canonical source for extraction into `.agent/INVARIANTS.md`.

📝 **FILL-IN** *(skip if there are no cross-component invariants yet)*

---

### {{INVARIANT_NAME}}

```
INVARIANT   : {{DESCRIPTION — formal statement as a condition that must always be true}}
              // E.g.: "The total active_sessions of a User must not exceed MAX_SESSIONS"
              //     "Every Order in COMPLETED state must have at least one PaymentRecord"

SCOPE       : Components : {{COMP_A}}, {{COMP_B}}, {{COMP_C}}
              Schemas    : `{{SCHEMA_1}}`, `{{SCHEMA_2}}`

ENFORCE BY  : {{COMP_A}}
              // The SOLE component responsible for checking this invariant before any related mutation.
              // One invariant — one owner component — avoids "everyone checks" = "no one checks"
              // Add annotation "Enforces: {{INVARIANT_NAME}}" to COMP_A's spec in BLUEPRINT Section 5

VIOLATED WHEN: {{Condition that violates it — write so it's easily expressed as an automated test}}
TEST REQUIRED: {{Pass/Fail criterion to verify the invariant in automated tests}}
              // E.g.: "ASSERT user.active_sessions.count <= MAX_SESSIONS after every session.create()"
```

> **When creating a new System Invariant:**
> 1. Add entry to this section
> 2. Add annotation `**Enforces:** {{INVARIANT_NAME}}` to the component spec of the ENFORCE BY component
>    in BLUEPRINT Section 5 (above the PSEUDOCODE of the responsible function)
> 3. Add smell indicator check: if the ENFORCE BY component is removed/renamed → invariant loses owner

---

## 4. INPUT / OUTPUT CONTRACTS

> I/O contracts of each entry point / API boundary in the system.
> This is the "agreement" between components — do not change without an ADR entry.

📝 **FILL-IN**

---

### {{OPERATION_1}}

> {{OPERATION_DESCRIPTION — what it does, why}}

```
INPUT  :: Ref<{{INPUT_SCHEMA}}>

OUTPUT :: Ref<{{OUTPUT_SCHEMA}}>
       | Ref<{{ERROR_CODE}}>   // when {{ERROR_CONDITION}}
       | Ref<{{ERROR_CODE}}>   // when {{ERROR_CONDITION}}

SIDE EFFECTS:
  - {{STATE_MUTATION_1}} : {{DESCRIPTION}}
  - {{EXTERNAL_CALL}}    : calls {{SERVICE}} with {{DATA}}

PRE-CONDITIONS:
  - {{field}} must {{CONDITION}} before calling
  - {{STATE}} must be in state {{STATE}}

POST-CONDITIONS:
  - {{STATE}} will transition to {{NEW_STATE}}
  - {{RESOURCE}} will be {{CREATED/UPDATED/DELETED}}

IDEMPOTENT: {{YES/NO}} — {{REASON}}
```

---

### {{OPERATION_2}}

📝 Add operations using the same format.

```
INPUT  :: Ref<{{INPUT_SCHEMA}}>

OUTPUT :: Ref<{{OUTPUT_SCHEMA}}>
       | Ref<{{ERROR_CODE}}>

SIDE EFFECTS: none

PRE-CONDITIONS:
  - {{CONDITION}}

POST-CONDITIONS:
  - {{RESULT}}

IDEMPOTENT: YES
```

---

## 5. ERROR REGISTRY

> All error codes are defined here with HTTP status, retryability, severity,
> message templates, and required context for debugging.

📝 **FILL-IN**

| Code | HTTP | Retryable? | Severity | Message Template | Required Context | When it happens |
|---|---|---|---|---|---|---|
| `{{ERR_1}}` | {{4xx/5xx}} | YES (backoff) | ERROR | `"{{MESSAGE_TEMPLATE}}"` | `{{FIELD_1}}`, `{{FIELD_2}}` | {{TRIGGER_CONDITION}} |
| `{{ERR_2}}` | {{4xx/5xx}} | NO | INFO | `"{{MESSAGE_TEMPLATE}}"` | `{{FIELD}}` | {{TRIGGER_CONDITION}} |

> **Severity guide:**
> - `FATAL` — system cannot continue, page on-call immediately
> - `ERROR` — operation failed, requires investigation; system still running
> - `WARN`  — no failure but unusual, needs monitoring
> - `INFO`  — user input error, no alert needed
>
> **Retryable guide:**
> - `YES (backoff)` — retry with exponential backoff, max {{N}} times
> - `YES (immediate)` — retry immediately, max {{N}} times
> - `NO` — retry will not change the outcome, client should not retry
>
> **Standard error format:**
> ```
> Error :: {
>   code      :: ErrorCode        // from this registry
>   message   :: string           // according to message template
>   context   :: Map<string, any> // fields listed in the "Context" column
>   retryable :: bool             // from the "Retryable?" column in registry
>   severity  :: Severity         // from the "Severity" column in registry
>   trace     :: string?          // optional, only in dev mode
> }
> ```

---

## 6. EXTERNAL CONTRACTS

> Interfaces with external services, third-party APIs, or databases.
> Document what this system *expects* from the outside — not the implementation of the outside.

📝 **FILL-IN**

### {{EXTERNAL_SERVICE_1}}

**Expected API Version:** v{{N}}
**Expected SLA:** {{N}}% uptime · P99 ≤ {{N}}ms response time
**Last verified:** {{YYYY-MM-DD}}
**Contact / Docs:** {{URL_OR_TEAM}}

```
// This system calls {{SERVICE}} with:
REQUEST :: {
  {{field}} :: {{Type}}
}

// This system expects {{SERVICE}} to return:
RESPONSE :: {
  {{field}} :: {{Type}}
}

// Failure modes this system must handle:
FAILURES ::
  | TIMEOUT          // after {{N}}ms → {{WHAT_TO_DO}}
  | UNAVAILABLE      // {{WHAT_TO_DO}}
  | VERSION_MISMATCH // detect via {{FIELD/HEADER}} → fail fast + alert, DO NOT try to parse
  | {{ERROR}}        // {{WHAT_TO_DO}}
```

> If the response schema changes incompatibly → alert + fail fast.
> DO NOT try to parse partial responses. See BLUEPRINT.md Section 6 for retry/circuit breaker strategy.
> If the external service/database/library is an architecture-relevant dependency → add/cross-ref BLUEPRINT.md Section 7 Dependency Fitness Registry.

---

## 7. NAMING CONVENTIONS

> Naming conventions throughout the codebase. Agents must adhere to these when generating code.

📝 **FILL-IN**

| Context | Convention | Example |
|---|---|---|
| Schema names | `PascalCase` | `UserProfile`, `OrderItem` |
| Field names | `snake_case` | `user_id`, `created_at` |
| Constants | `SCREAMING_SNAKE` | `MAX_RETRY`, `DEFAULT_TIMEOUT` |
| Functions | `snake_case` | `compute_score()`, `build_report()` |
| Error codes | `SCREAMING_SNAKE` with domain prefix | `AUTH_INVALID_TOKEN`, `ORDER_NOT_FOUND` |
| File / module names | `snake_case` | `user_service.py`, `order_handler.ts` |
| {{CONTEXT}} | `{{CONVENTION}}` | `{{EXAMPLE}}` |

**Domain-specific rules:**

📝 **FILL-IN:** Specific rules of this domain that agents cannot infer from general conventions.

```
{{RULE_1}}: {{DESCRIPTION}}
  ✅ {{CORRECT}}
  ❌ {{INCORRECT}}
```

---

## 8. SCHEMA CHANGELOG

> Append-only. Every schema change must have an entry here.
> Breaking changes must have a corresponding ADR entry in ADR.md.
> **Date format: YYYY-MM-DD (ISO 8601).**

| Version | Date | Schema | Change | Breaking? | ADR Ref |
|---|---|---|---|---|---|
| v1.0 | {{YYYY-MM-DD}} | — | Init schema registry | — | — |
| 📝 | | | | | |

> **Template for an entry:**
> `| v{{X.Y}} | {{YYYY-MM-DD}} | {{SCHEMA}} | {{ADDED/REMOVED/RENAMED/DEPRECATED}}: {{FIELD}} {{→ NEW_NAME/TYPE}} | {{YES/NO}} | ADR-{{N}} |`

---

## 9. DEPRECATION REGISTRY

> Fields and schemas in the process of being removed.
> Entries here: still exist in the schema definition but **DO NOT use for new logic**.
> Generated code MUST emit deprecation warnings when encountering fields/schemas in this registry.
> Removal is a breaking change → an ADR entry is mandatory before deletion.

📝 **FILL-IN** *(skip if there are no deprecations yet)*

| Schema | Deprecated Field / Schema | Deprecated since | Removal target | Migration path | ADR Ref |
|---|---|---|---|---|---|
| `{{SCHEMA}}` | `{{field}}` | v{{X.Y}} | v{{X+1.0}} | Use `{{NEW_FIELD}}` instead | ADR-{{N}} |
| `{{SCHEMA}}` | *(entire schema)* | v{{X.Y}} | v{{X+1.0}} | Use `{{NEW_SCHEMA}}` | ADR-{{N}} |

> **Lifecycle of a field/schema:**
> ```
> ACTIVE
>   │
>   ├─[team decides to remove]──▶ DEPRECATED ─── log in this registry, bump minor version
>   │                                   │
>   │                                   ├─[migration done, after ≥1 release cycle]
>   │                                   ▼
>   │                               REMOVED ────── log in Schema Changelog, bump major + ADR
>   │
>   └─ Cannot skip directly from ACTIVE to REMOVED if there are external consumers
> ```

---

## 10. GLOSSARY

> Domain terms and abbreviations used in schemas, comments, and pseudocode.
> Agents MUST use these exact definitions when generating code, docs, log messages, and error messages.
> If a term appears in a schema comment but is not in this table → add it.

📝 **FILL-IN** *(skip if all terms are self-explanatory)*

| Term | Definition | Do not confuse with | Status |
|---|---|---|---|
| **{{TERM_1}}** | {{EXACT_DEFINITION_ACCORDING_TO_BUSINESS_DOMAIN}} | `{{SIMILAR_TERM}}` — differs in {{DIFFERENCE}} | `STABLE` |
| **{{TERM_2}}** | {{DEFINITION}} | — | `STABLE` |
| **{{ABBR}}** | {{FULL_FORM}} ({{SHORT_DEFINITION}}) | — | `STABLE` |

> **Term Status:**
> - `STABLE` — definition is finalized, no debate (default)
> - `CHALLENGED: see ADR-N` — term is being debated; see ADR-N for context and official decision
>
> If two people on the team define the same term differently → this is an Ubiquitous Language conflict:
>   1. Set status to `CHALLENGED: see ADR-N` for that term
>   2. Create an ADR to document the context, options, and decision on which definition to choose
>   3. After ADR is ACCEPTED → update status → `STABLE`
>
> DO NOT leave a term `CHALLENGED` for too long — an unresolved term conflict is a design failure in the making.
