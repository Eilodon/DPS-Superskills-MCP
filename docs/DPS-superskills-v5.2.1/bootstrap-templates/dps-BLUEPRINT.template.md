# BLUEPRINT.md — Behavior Specification
> **DPS VERSION:** `5.0-template`
> **DPS PROFILE:** `DPS-Standard` *(choose: `DPS-Lite` / `DPS-Standard` / `DPS-Critical`)*
### {{PROJECT_NAME}} · v{{VERSION}} · compatible with: [CONTRACTS v{{X}}, ADR v{{Z}}]

> **Purpose of this file:** To describe *how the system works* — not *how it looks*.
> Schemas are already in CONTRACTS.md — this file only **references**, does not redefine.
>
> Agents read this file to: understand enough to implement without needing to ask any further questions.


> **DPS STATUS:** `DRAFT` *(choose: `DRAFT` / `PROOF-READY` / `APPROVED-SSOT` / `IMPLEMENTATION-ACTIVE` / `LIVING-SPEC` / `SUPERSEDED`)*
> **PROMOTED BY:** {{WHO}} · **PROMOTED AT:** {{YYYY-MM-DD}}
> **PROMOTION BASIS:** {{review / stress-test / spike / audit / validation evidence}}
> **CURRENT AUTHORITY:** `DPS` *(default template value)* — if not `DPS`, specify the reason and scope.
>
> **Rule:** `DRAFT` must not be used as an implementation source for agents. Only `APPROVED-SSOT`, `IMPLEMENTATION-ACTIVE`, or `LIVING-SPEC` hold implementation authority.
---

## Table of Contents

1. [System Overview](#1-system-overview)
   - [Trace Index](#trace-index)
   - [Proof Handoff Snapshot](#proof-handoff-snapshot)
   - [Scope Boundary Log](#scope-boundary-log)
2. [Component Registry](#2-component-registry)
3. [Data Flow](#3-data-flow)
4. [State Machine](#4-state-machine)
5. [Component Specifications](#5-component-specifications)
   - [Implementation Trace Anchors](#implementation-trace-anchors)
6. [Integration Points](#6-integration-points)
7. [Non-Functional Requirements](#7-non-functional-requirements)
   - [Dependency Fitness Registry](#dependency-fitness-registry)
8. [Scaffolding & Build Order](#8-scaffolding--build-order)
9. [Observability](#9-observability)

---

## 1. SYSTEM OVERVIEW

### SYSTEM INTENT

📝 **FILL-IN:** Fill this in before writing any technical spec.
This is the anchor layer — all architectural decisions must be traceable back to this.

```
PROBLEM      : {{Specific problem — written from a user perspective, not technical}}
               // Correct: "Merchants have no way to look up transaction history in realtime without calling support"
               // Incorrect: "Need a reporting module for transaction data"

FOR          : {{Who — specific user/customer segment, not "everyone"}}
               // Correct: "SME merchants with < 500 transactions/day, no dedicated IT team"
               // Incorrect: "users of the platform"

ASSUMING     : {{Assumption about the world — what must be true for this system to have value}}
               // E.g.: "Merchants want self-serve reporting instead of calling support"
               //     "Volume < X transactions/day in the first 12 months"
               //     "Regulatory requirement R does not change within this scope"

WILL_DRIFT_IF: {{When these assumptions might become false — business context trigger}}
               // E.g.: "Product pivots to enterprise segment (FOR changes)"
               //     "Volume exceeds X → architecture assumption becomes invalid"
               //     "Regulation R changes → ASSUMING becomes invalid"

NON-GOALS   : {{What the system is not trying to solve in this version}}
               // E.g.: "Not optimizing for enterprise bulk export in this phase"
               //     "Not replacing the data warehouse / BI stack"

ANTI-REQUIREMENTS:
               {{Behaviors or shapes the system must not take, even if they seem convenient}}
               // E.g.: "Do not introduce hidden async reconciliation if users expect realtime"
               //     "Do not persist derived fields if CONTRACTS marks them as computed"
```

> **Why this block is important:**
> When developers read the spec 6 months later and find the design "looks weird",
> they have two context layers: ADR (why that technical decision was made),
> and SYSTEM INTENT (why this system exists with that assumption).
> If `WILL_DRIFT_IF` has occurred → it is a signal to re-evaluate the entire spec, not just a specific ADR.
> Handling trigger: **Trigger 0** in DPS Maintenance Cadence (see README.md).

---

📝 **FILL-IN:** ASCII diagram describing the overall architecture.
Goal: upon reading, agents instantly know what kind of system this is and what the major components are.

```
┌─────────────────────────────────────────────────────┐
│                   {{SYSTEM_NAME}}                   │
│                                                     │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐    │
│  │{{COMP_A}}│────▶│{{COMP_B}}│────▶│{{COMP_C}}│    │
│  └──────────┘     └──────────┘     └──────────┘    │
│                        │                            │
│                        ▼                            │
│                   ┌──────────┐                      │
│                   │{{COMP_D}}│                      │
│                   └──────────┘                      │
└─────────────────────────────────────────────────────┘
       ▲ {{EXTERNAL_INPUT}}         {{OUTPUT}} ▶
```

**Main flow in one sentence:** {{SHORT_E2E_FLOW_DESCRIPTION}}

**What this system DOES NOT do:** {{OUT_OF_SCOPE}} — see ADR-{{N}} for reasons.

**SUCCESS CRITERIA** *(implementation compass — distilled from PRD, max 3 measurable signals)*

📝 **FILL-IN**

```
✅ {{SIGNAL_1}} : {{MEASURABLE_DESCRIPTION}}   // e.g.: "payment flow passes 100% contract tests"
✅ {{SIGNAL_2}} : {{MEASURABLE_DESCRIPTION}}   // e.g.: "P99 latency ≤ 200ms under load test of 100 req/s"
✅ {{SIGNAL_3}} : {{MEASURABLE_DESCRIPTION}}   // e.g.: "retry storm does not occur when external service is down"
```

> Agents use this block to determine "what done looks like" — not business KPIs or dashboards.
> If implementation is complete but one signal hasn't passed → it is not done. When all pass → phase gate can proceed.
> Keep it ≤ 3 signals: this is a compass, not the full spec (that is the job of Section 5 and Section 7).


### TRACE INDEX

> A one-page map from intent/success signals to decisions, contracts, components, phases, and evidence.
> This is an index for reviewers/agents to quickly stress-test coverage; details remain in their original sections.

📝 **FILL-IN**

| Intent / Success Signal | ADR Origin | Contract / Schema | Component | Phase | Metric / Test / Evidence |
|---|---|---|---|---|---|
| `{{SIGNAL_1}}` | ADR-{{N}} | `Ref<{{SCHEMA}}>` | `{{COMP_A}}` | Phase {{N}} | `{{TEST_OR_METRIC}}` |
| `{{SIGNAL_2}}` | ADR-{{N}} | `Ref<{{SCHEMA}}>` | `{{COMP_B}}` | Phase {{N}} | `{{TEST_OR_METRIC}}` |
| `{{SIGNAL_3}}` | ADR-{{N}} | `Ref<{{SCHEMA}}>` | `{{COMP_C}}` | Phase {{N}} | `{{TEST_OR_METRIC}}` |

> Smell: A success signal does not map to any component/phase/test → the target portrait is not yet implementable or the success signal is at the wrong level.

---

### PROOF HANDOFF SNAPSHOT

> A short snapshot to promote `PROOF-READY` → `APPROVED-SSOT`.
> Full guide is in README.md Proof Handoff Interface. This section only records the current state of the blueprint.

| Proof Target | Status | Evidence / Link | Blocker? |
|---|---|---|---|
| Intent coherence | `{{PASS/PENDING/FAIL}}` | {{REF}} | {{YES/NO}} |
| Contract consistency | `{{PASS/PENDING/FAIL}}` | {{REF}} | {{YES/NO}} |
| Behavior determinism | `{{PASS/PENDING/FAIL}}` | {{REF}} | {{YES/NO}} |
| Build feasibility | `{{PASS/PENDING/FAIL}}` | {{REF}} | {{YES/NO}} |
| Dependency fitness | `{{PASS/PENDING/FAIL}}` | {{REF}} | {{YES/NO}} |

---

### SCOPE BOUNDARY LOG

> Append-only. Records any changes to the system's scope.
> Scope boundary changes often affect multiple ADRs simultaneously — you must track the Review Status of ALL impacted ADRs.
> This is an enforcement mechanism, not a changelog.

| Version | Date | Change | Rationale | Impact ADRs | Review Status |
|---|---|---|---|---|---|
| v1.0 | {{YYYY-MM-DD}} | Initial scope definition | — | — | — |
| 📝 | | | | | |

> **Entry template:**
> `| v{{X.Y}} | {{YYYY-MM-DD}} | {{WHAT_CHANGED}} | {{WHY}} | ADR-{{N}}, ADR-{{M}} | {{STATUS}} |`
>
> **Review Status values:**
> - `✅ All reviewed` — all impacted ADRs have been reviewed after this scope change
> - `🔄 Pending: ADR-{{N}}` — ADR-N has not been reviewed
> - `⚠️ OVERRIDE: {{REASON}}` — scope change accepted without sufficient review, clearly state reason and accept risk
>
> ⚠️ When scope changes → you must not only record the change but also update the Review Status of ALL ADRs in Impact ADRs.
> The phase gate cannot advance if the Review Status is still `🔄 Pending`.

---

## 2. COMPONENT REGISTRY

> Each component has a single responsibility. No overlaps.
> Trigger 4 extension point: teams may add a `Test file` column to this registry or the Section 5 component specs when mapping STRICT/CRITICAL proof obligations to concrete tests.

📝 **FILL-IN**

| Component | File/Module | Responsibility | Input | Output | Stateful? | Break Pattern | Business Impact | Proof Standard | ADR Origin |
|---|---|---|---|---|---|---|---|---|---|
| **{{COMP_A}}** | `{{path}}` | {{ONE_SENTENCE}} | `Ref<{{SCHEMA}}>` | `Ref<{{SCHEMA}}>` | {{YES/NO}} | {{WHY_IT_MIGHT_BREAK}} | {{COST_OF_BREAKING}} | `{{STANDARD\|STRICT\|CRITICAL}}` | ADR-{{N}} |
| **{{COMP_B}}** | `{{path}}` | {{ONE_SENTENCE}} | `Ref<{{SCHEMA}}>` | `Ref<{{SCHEMA}}>` | {{YES/NO}} | {{WHY_IT_MIGHT_BREAK}} | {{COST_OF_BREAKING}} | `{{STANDARD\|STRICT\|CRITICAL}}` | ADR-{{N}} |
| **{{COMP_C}}** | `{{path}}` | {{ONE_SENTENCE}} | `Ref<{{SCHEMA}}>` | `Ref<{{SCHEMA}}>` | {{YES/NO}} | {{WHY_IT_MIGHT_BREAK}} | {{COST_OF_BREAKING}} | `{{STANDARD\|STRICT\|CRITICAL}}` | ADR-{{N}}, ADR-{{M}} |

> **ADR Origin Column:** Which ADR decided this component should exist or be designed this way.
> When a component is a consequence of multiple ADRs: `ADR-N, ADR-M` — comma-separated.
> Agents read this column before suggesting changes to a component — they must understand the original rationale before refactoring.

> **"Stateful"** = component maintains state between invocations.
> Stateful components require a clear strategy in Section 4 (State Machine).

> **FAILURE PROFILE — two independent axes:**
> - **Break Pattern** — *why* this component might break: e.g. `async race condition`, `dependency timeout`, `schema mismatch`, `resource exhaustion`
> - **Business Impact** — *the cost* when it breaks: e.g. `UX degraded`, `revenue blocked`, `data loss`, `cascade outage`
>
> **Proof Standard** is derived from the combination of Break Pattern × Business Impact — do not assign arbitrarily:
> - `STANDARD`  — unit tests suffice; failure is isolated, recoverable, no direct business consequences
> - `STRICT`    — integration tests + failure-condition tests required; interruption is recoverable but user-visible
> - `CRITICAL`  — contract tests + failure-condition tests + manual sign-off; failure = data loss / revenue / outage
>
> ⚠️ A `STRICT` or `CRITICAL` component → **Section 5 must have corresponding failure-condition test cases**.
> Operation-level override is allowed when only certain functions have a higher risk than the component default. The override must be noted immediately below the function heading.

---

## 3. DATA FLOW

> How data flows through the system — from input to output.
> Each step: who acts, what operation is used, what is the input/output schema.

📝 **FILL-IN**

### Happy Path — {{MAIN_FLOW_NAME}}

```
[1] {{ACTOR/TRIGGER}}
      │ produces: Ref<{{SCHEMA}}>
      ▼
[2] {{COMP_A}}: {{OPERATION}}
      │ input:  Ref<{{INPUT_SCHEMA}}>
      │ output: Ref<{{OUTPUT_SCHEMA}}>
      │ side effect: {{IF_ANY}}
      ▼
[3] {{COMP_B}}: {{OPERATION}}
      │ input:  Ref<{{INPUT_SCHEMA}}>
      │ output: Ref<{{OUTPUT_SCHEMA}}>
      ▼
[N] {{FINAL_STATE}}
      └─ result: Ref<{{RESULT_SCHEMA}}>
```

### Error Path — {{ERROR_SCENARIO_NAME}}

```
[2] {{COMP_A}}: {{OPERATION}} → FAIL
      │ error: Ref<{{ERROR_CODE}}>   // when {{CONDITION}}
      ▼
[2a] {{ERROR_HANDLING}}
      └─ {{RECOVERY_OR_PROPAGATION}}
```

### Edge Case — {{EDGE_CASE_NAME}}

📝 **FILL-IN:** Each important edge case needs its own flow diagram.

```
[{{STEP}}] {{SPECIAL_CONDITION}}
      ▼
{{SPECIAL_HANDLING}}
```

---

## 4. STATE MACHINE

> Only fill out this section if the system has stateful components (see Component Registry).
> This is the source of truth for all state transitions — do not implement any transition
> that is not in this diagram.

📝 **FILL-IN** *(skip if entirely stateless)*

```
STATES:
  {{STATE_INIT}}      — {{MEANING}}
  {{STATE_A}}         — {{MEANING}}
  {{STATE_B}}         — {{MEANING}}
  {{STATE_TERMINAL}}  — {{MEANING}}
  {{STATE_ERROR}}     — {{MEANING}}

TRANSITIONS:
  {{STATE_INIT}}  ──[{{EVENT}}]──▶  {{STATE_A}}
                     guard: {{CONDITION}}
                     action: {{WHAT_HAPPENS}}

  {{STATE_A}}     ──[{{EVENT}}]──▶  {{STATE_B}}
                     guard: {{CONDITION}}
                     action: {{WHAT_HAPPENS}}

  {{STATE_A}}     ──[{{EVENT}}]──▶  {{STATE_ERROR}}
                     guard: {{ERROR_CONDITION}}
                     action: {{WHAT_HAPPENS}}

  {{STATE_B}}     ──[{{EVENT}}]──▶  {{STATE_TERMINAL}}
                     guard: none
                     action: {{WHAT_HAPPENS}}

INVARIANTS:
  - Cannot transition from {{STATE_TERMINAL}} to any other state
  - {{STATE_ERROR}} can only be reached from {{LIST_STATES}}
  - {{OTHER_INVARIANT}}
```

### Concurrency Model

> Fill out if there are stateful components and potential concurrent access.
> If completely stateless → skip this subsection.

📝 **FILL-IN** *(skip if no concurrent mutations)*

```
CONCURRENCY STRATEGY: {{OPTIMISTIC_LOCK / PESSIMISTIC_LOCK / ACTOR_MODEL / IMMUTABLE_EVENTS}}

IDEMPOTENCY KEY: {{FIELD}} — used to detect and reject duplicate requests

CONFLICT SCENARIO: 2 actors simultaneously mutate {{STATE}} of the same {{ENTITY}}
  Strategy  : {{LAST_WRITE_WINS / FIRST_WRITE_WINS / MERGE / REJECT_SECOND}}
  Detect    : compare {{VERSION_FIELD / ETAG / TIMESTAMP}}
  On conflict → {{SPECIFIC_HANDLING — return error / retry / merge}}

STATE PERSISTENCE: {{IN_MEMORY / DATABASE / CACHE}}
  - If process crashes → recover state from {{SOURCE}}
  - Initialization: {{LOAD_FROM_DB / START_FRESH / REPLAY_EVENTS}}

RACE CONDITION RISKS:
  - {{RISK_1}}: occurs when {{CONDITION}} → mitigate by {{METHOD}}
  - {{RISK_2}}: occurs when {{CONDITION}} → mitigate by {{METHOD}}
```

---

## 5. COMPONENT SPECIFICATIONS

> For each component: pseudocode detailed enough to implement without needing clarification.
> Level of detail: if an agent finishes reading and still needs to ask → not detailed enough.

📝 **FILL-IN:** One section for each component in the Component Registry.

### Implementation Trace Anchors

> A trace anchor is a lightweight comment/metadata placed at a module boundary, public API boundary, migration script, external adapter, or invariant enforcement point.
> Goal: code can be traced back to the target portrait without turning source code into a documentation dump.

**Canonical format:**

```
DPS: BLUEPRINT §5 {{COMPONENT}}.{{operation}} | ADR-{{N}} | CONTRACTS Ref<{{SCHEMA_OR_ERROR}}>
```

**Rules:**

```
- Trace anchors are not needed for every small line/function.
- Mandatory for component boundaries, critical operations, external integrations, migrations, and invariant enforcement points.
- If code changes behavior but the trace anchor still points to the old spec → classify via the Change Classification Protocol before modifying.
```

---

### {{COMP_A}}

**File:** `{{path/to/file}}`
**Dependencies:** `{{COMP_B}}` (calls), `{{EXTERNAL_SERVICE}}` (calls)
**Called by:** `{{COMP_C}}`, `{{ORCHESTRATOR}}`
**Enforces:** `{{INVARIANT_NAME}}` *(from CONTRACTS Section 3.X — omit if not applicable)*
**Last synced:** {{YYYY-MM-DD}}   — see Trigger 3 in README.md (if impl file changes multiple times but this field doesn't → potential spec drift)

#### Function: `{{function_name}}()`

**Implementation Trace Anchor:** `DPS: BLUEPRINT §5 {{COMP_A}}.{{function_name}} | ADR-{{N}} | CONTRACTS Ref<{{SCHEMA}}>`
**Proof Standard override:** `{{INHERIT|STANDARD|STRICT|CRITICAL}}` — defaults to `INHERIT` from Component Registry; override only when the function risk differs from the component default.

```
SIGNATURE:
  {{function_name}}(
    param_1: Ref<{{SCHEMA}}>,
    param_2: {{Type}}
  ) → Ref<{{OUTPUT_SCHEMA}}> | Ref<{{ERROR_CODE}}>

PSEUDOCODE:
  1. Validate param_1:
       if param_1.{{field}} is null → return Ref<{{ERR_VALIDATION}}>
       if param_1.{{field}} < 0     → return Ref<{{ERR_RANGE}}>

  2. Get {{RESOURCE}} from {{SOURCE}}:
       result = {{COMP_B}}.{{operation}}(param_1.{{field}})
       if result is error → propagate Ref<{{ERR_NOT_FOUND}}>

  3. Transform:
       output = Ref<{{OUTPUT_SCHEMA}}> {
         {{out_field_1}}: result.{{in_field}},
         {{out_field_2}}: compute_{{x}}(param_1, result),
         {{out_field_3}}: {{CONST_1}}
       }

  4. Side effect: {{DESCRIPTION_IF_ANY}}

  5. return output

COMPLEXITY: {{O(n) / O(1) / ...}} — {{REASON_IF_NOT_OBVIOUS}}
```

> **When logic is complex with N conditions × M outcomes, use a decision table instead of pseudocode:**
> ```
> DECISION TABLE: {{FUNCTION_NAME}}
>   | Condition 1 | Condition 2 | ... | → Output / Action  |
>   |-------------|-------------|-----|---------------------|
>   | TRUE        | TRUE        | ... | → {{ACTION_A}}     |
>   | TRUE        | FALSE       | ... | → {{ACTION_B}}     |
>   | FALSE       | *           | ... | → {{ACTION_C}}     |
>
> // * = "don't care" — condition is not relevant for this case
> // Every row must have exactly one outcome. No "implicit" cases.
> // Decision tables self-document completeness: a combination missing a row → missing case.
> ```

**DETERMINISM CHECK** *(self-verify before submitting — mandatory)*
```
✅ Every error code in SIGNATURE has a path triggering it in pseudocode
✅ Every conditional (if X → ...) has an explicitly specified else path (not implicit)
✅ Every external call ({{COMP_B}}.operation()) has a failure path
✅ Every stateful mutation lists specifically which fields are modified
✅ Happy path executes end-to-end without requiring implicit assumptions about state
```

**Test cases to cover:**
```
✅ Happy path: {{DESCRIPTION}}
✅ Edge case:  {{DESCRIPTION}}
✅ Error:      param_1.{{field}} null → Ref<{{ERR_VALIDATION}}>
✅ Error:      {{COMP_B}} unavailable → Ref<{{ERR_DEPENDENCY}}>
```

> **Proof Standard for this component:** `{{STANDARD|STRICT|CRITICAL}}` — see Component Registry Section 2.
>
> If Proof Standard is `STRICT` or `CRITICAL`, mandatory additions:
> ```
> ✅ Failure: {{BREAK_PATTERN}} occurs → {{EXPECTED_DEGRADED_BEHAVIOR_OR_FALLBACK}}
> ✅ Failure: {{DEPENDENCY}} timeout / unavailable → {{EXPECTED_BEHAVIOR}} (must not silent fail)
> ✅ Failure: concurrent mutation on the same {{ENTITY}} → {{CONFLICT_RESOLUTION}}
> ```
> These failure-condition tests verify *system behavior when it breaks* — different from Error tests that verify *happy-path validations*.

---

#### Function: `{{function_2_name}}()`

**Implementation Trace Anchor:** `DPS: BLUEPRINT §5 {{COMP_A}}.{{function_2_name}} | ADR-{{N}} | CONTRACTS {{Type}}`
**Proof Standard override:** `{{INHERIT|STANDARD|STRICT|CRITICAL}}`

📝 Add following the same format.

```
SIGNATURE:
  {{function_2_name}}(
    param_1: {{Type}}
  ) → {{ReturnType}}

PSEUDOCODE:
  1. {{STEP_1}}
  2. {{STEP_2}}
  3. return {{VALUE}}

DETERMINISM CHECK:
✅ Every error code in SIGNATURE has a path triggering it in pseudocode
✅ Every conditional has an explicitly specified else path
✅ Every external call has a failure path
✅ Every stateful mutation lists specifically which fields are modified
✅ Happy path executes end-to-end without requiring implicit assumptions about state
```

---

### {{COMP_B}}

**File:** `{{path/to/file}}`
**Dependencies:** `{{LIST}}`
**Called by:** `{{LIST}}`
**Enforces:** *(omit if no System Invariant is assigned to this component)*
**Last synced:** {{YYYY-MM-DD}}   — see Trigger 3 in README.md

#### Function: `{{function_name}}()`

**Implementation Trace Anchor:** `DPS: BLUEPRINT §5 {{COMP_B}}.{{function_name}} | ADR-{{N}} | CONTRACTS Ref<{{SCHEMA}}>`
**Proof Standard override:** `{{INHERIT|STANDARD|STRICT|CRITICAL}}` — defaults to `INHERIT` from Component Registry; override only when the function risk differs from the component default.

```
SIGNATURE:
  {{function_name}}(
    param_1: {{Type}}
  ) → {{ReturnType}} | Ref<{{ERROR_CODE}}>

PSEUDOCODE:
  1. {{STEP_1}}
  2. {{STEP_2}}
  3. return {{VALUE}}

DETERMINISM CHECK:
✅ Every error code in SIGNATURE has a path triggering it in pseudocode
✅ Every conditional has an explicitly specified else path
✅ Every external call has a failure path
✅ Every stateful mutation lists specifically which fields are modified
✅ Happy path executes end-to-end without requiring implicit assumptions about state
```

📝 Add components following the same pattern.

---

## 6. INTEGRATION POINTS

> How this system integrates with the outside world.
> This is the implementation guide for external contracts defined in CONTRACTS.md Section 6.

📝 **FILL-IN**

### {{EXTERNAL_SERVICE_1}}

**Used in component:** `{{COMP}}`
**Protocol:** {{REST/gRPC/WebSocket/Queue/...}}
**Auth:** {{API_KEY/OAuth2/mTLS/...}}

```
// Retry strategy
MAX_RETRIES = {{N}}
BACKOFF     = exponential, base {{N}}ms, cap {{N}}ms
TIMEOUT     = {{N}}ms per attempt

// Circuit breaker (if applicable)
OPEN when:    {{N}} failures in {{WINDOW}}s
HALF-OPEN:   try again after {{N}}s
CLOSE when:   {{N}} consecutive successes
```

**Token refresh (if using OAuth2/JWT):**
```
TOKEN_TTL   = {{N}}s
REFRESH_AT  = TTL - {{BUFFER}}s         // proactive refresh before expiration
REFRESH_BY  : {{RESPONSIBLE_COMP}}      // the SOLE component allowed to call refresh

// When receiving 401 Unauthorized:
  1. {{COMP}} calls {{TOKEN_REFRESH_ENDPOINT}}
  2. If refresh succeeds → retry the original request EXACTLY ONCE
  3. If refresh fails    → propagate Ref<{{ERR_AUTH_EXPIRED}}>, DO NOT retry
  4. If there are pending concurrent requests → wait for refresh to finish, DO NOT create multiple concurrent refreshes
```

**Fallback when unavailable:** {{FALLBACK_DESCRIPTION_OR_"NO_FALLBACK_—_FAIL_FAST"}}

---

## 7. NON-FUNCTIONAL REQUIREMENTS

> Constraints not about behavior but about quality attributes.
> These are implementation constraints — agents must respect them when generating code.

📝 **FILL-IN**

### Performance

| Operation | P50 | P99 | Throughput / Limit | Source |
|---|---|---|---|---|
| `{{OPERATION_1}}` | ≤ {{N}}ms | ≤ {{N}}ms | ≥ {{N}} req/s | ADR-{{N}} |
| `{{OPERATION_2}}` | ≤ {{N}}ms | ≤ {{N}}ms | — | PRD §{{N}} |
| `{{OPERATION_3}}` | ≤ {{N}}s max | — | ≤ {{N}}MB memory | ASSUMED |

```
// Source values — mandatory to fill, do not leave blank:
//   ADR-N    — target from an architectural decision; has rationale and assumption document
//   PRD §N   — hard requirement from PRD; must be clear who owns it
//   MEASURED — from actual benchmark/load test; include date + measurement conditions
//   ASSUMED  — estimate without evidence yet → must have a VALIDATION TARGET in the related ADR
//              ⚠️ ASSUMED is not a placeholder — it is an explicit flag "this number needs validation"
```

### Reliability

```
Availability target : {{99.x%}}
Recovery time (RTO) : ≤ {{N}} mins
Recovery point (RPO): ≤ {{N}} mins
```

### Security

```
Authentication : {{DESCRIPTION}}
Authorization  : {{DESCRIPTION}}
Data at rest   : {{ENCRYPT/PLAIN/N/A}}
Data in transit: {{TLS_VERSION/N/A}}
Sensitive fields DO NOT log: {{LIST_FIELDS}}
```

### Scalability

```
Current target : {{N}} users / {{N}} req/day
Design ceiling : {{N}}x current (without re-architecting)
Scaling trigger: {{METRIC}} > {{THRESHOLD}} → {{ACTION}}
```

### Testing Strategy

> Clear test boundaries prevent agents from generating missing tests or testing at the wrong layer.

📝 **FILL-IN**

| Layer | Scope | What to mock | Gate (see Section 8) |
|---|---|---|---|
| **Unit** | Pure functions in each component | All I/O and dependencies | Phase {{N}} |
| **Integration** | {{COMP_A}} ↔ {{COMP_B}} boundary | External services | Phase {{N}} |
| **Contract** | All I/O contracts in CONTRACTS.md Section 4 | — | Phase {{N}} |
| **E2E** | Happy path + {{N}} critical error paths end-to-end | — | Phase {{N}} |

```
// Test data strategy
Happy path data  : {{SOURCE — fixtures / factory / seed script}}
Edge case data   : {{SOURCE}}
Error simulation : {{HOW to inject failure — mock / chaos / feature flag}}

// Coverage targets
Unit coverage    : ≥ {{N}}% line coverage on business logic
Contract tests   : 100% operations in CONTRACTS.md Section 4
```

### Dependency Fitness Registry

> Architecture-relevant dependencies are disguised decisions. Agents must not add new libraries/frameworks/packages purely out of convenience if they affect behavior, security, runtime, deployment, data models, or external contracts.

📝 **FILL-IN**

| Dependency | Purpose | Version / Constraint | ADR Origin | Fit Assumption | Last verified | Reconsider if |
|---|---|---|---|---|---|---|
| `{{LIB_OR_FRAMEWORK}}` | {{Used for what}} | `{{VERSION_RANGE}}` | ADR-{{N}} | {{Why this dependency fits the intent/design}} | {{YYYY-MM-DD}} | {{Trigger to change or re-evaluate}} |
| `{{SERVICE_OR_DB}}` | {{Used for what}} | {{VERSION/SLA}} | ADR-{{N}} | {{Assumption about capabilities/limits}} | {{YYYY-MM-DD}} | {{Trigger}} |

**Rules:**
```
- A dependency is only used in code if it has an entry in this registry or is clearly dev-only tooling.
- If a dependency changes behavior/runtime/security/data model → create or update an ADR.
- Last verified > 3 months with a WATCHFUL/VOLATILE dependency → Arc 2 smell.
- Dependency on external API/service must cross-ref CONTRACTS Section 6 External Contracts.
```

---

### Configuration Management

> All values that can change by environment must pass through config — no hard-coding.

📝 **FILL-IN**

| Config key | Type | Default | Override by | Used in component | Sensitive? |
|---|---|---|---|---|---|
| `{{ENV_VAR_1}}` | string | `{{DEFAULT}}` | env var | `{{COMP}}` | NO |
| `{{ENV_VAR_2}}` | int | `{{DEFAULT}}` | env var / config file | `{{COMP}}` | YES — mask in logs |
| `{{FEATURE_FLAG}}` | bool | `false` | feature flag system | `{{COMP}}` | NO |

```
// Config validation at startup (fail fast — do not run with missing/incorrect config)
If {{REQUIRED_VAR}} is not set        → exit with clear error message
If {{VAR}} is out of bounds [{{MIN}}, {{MAX}}] → exit with clear error message
DO NOT use implicit defaults for required configs
```

---

## 8. SCAFFOLDING & BUILD ORDER

> The order in which files are created and features are implemented.
> Technical dependencies between steps are REAL — do not reverse the order.

📝 **FILL-IN**

```
PHASE 0 — Foundation (implement before anything else)
  [0.1] {{FILE/MODULE}}     — because: {{REASON_TO_GO_FIRST}}
  [0.2] {{FILE/MODULE}}     — because: {{REASON_TO_GO_FIRST}}

  📌 SPEC NOTES — mid-phase observations (non-blocking, resolve at gate)
  | Date       | Author   | Ref              | Type          | Observation            | Gate Action                          |
  |------------|----------|------------------|---------------|------------------------|--------------------------------------|
  | {{YY-MM-DD}} | {{WHO}} | ADR-N / Section X | `OBSERVATION` | {{What was found}}     | Update spec / New ADR / Investigate  |
  // Types: OBSERVATION = "spec might need update but unconfirmed"
  //        TENSION     = "impl pulls in a different direction but no conflict yet"
  //        QUESTION    = "spec is unclear about case Y, needs clarification before gate"
  // SPEC NOTES do not block the gate. But Learning Loop Q1 must address all unresolved SPEC NOTES.
  // Gate DOES NOT pass if a SPEC NOTE exists past 1 phase without a response.

  Gate: {{CONDITION_TO_PASS_PHASE_0}}
        + LEARNING LOOP — answer and produce artifacts before advancing:
          Q1: What did this implementation phase reveal that the spec did not anticipate?
              → Artifact: update CONTRACTS/BLUEPRINT or create new ADR (or write "none")
          Q2: Have any decisions with CONFIDENCE = LOW been validated or falsified?
              → Artifact: update Confidence tag + VALIDATION TARGET in related ADR
          Q3: [Only if this phase has production exposure] Do the observed failure patterns
              match the current Proof Standard?
              → Artifact: update Component Registry + Section 5 test cases if needed

PHASE 1 — Core Logic
  [1.1] {{FILE/MODULE}}     — depends on: [0.1]
  [1.2] {{FILE/MODULE}}     — depends on: [0.1], [0.2]
  [1.3] {{FILE/MODULE}}     — depends on: [1.1]

  📌 SPEC NOTES — mid-phase observations (non-blocking, resolve at gate)
  | Date       | Author   | Ref              | Type          | Observation            | Gate Action                          |
  |------------|----------|------------------|---------------|------------------------|--------------------------------------|
  | {{YY-MM-DD}} | {{WHO}} | ADR-N / Section X | `OBSERVATION` | {{What was found}}     | Update spec / New ADR / Investigate  |

  Gate: {{CONDITION_TO_PASS_PHASE_1}}
        + STRICT/CRITICAL components in this phase: failure-condition tests pass (Section 5)
        + LEARNING LOOP — answer and produce artifacts before advancing:
          Q1: What did this implementation phase reveal that the spec did not anticipate?
              → Artifact: update CONTRACTS/BLUEPRINT or create new ADR (or write "none")
          Q2: Have any decisions with CONFIDENCE = LOW been validated or falsified?
              → Artifact: update Confidence tag + VALIDATION TARGET in related ADR
          Q3: [Only if this phase has production exposure] Do the observed failure patterns
              match the current Proof Standard?
              → Artifact: update Component Registry + Section 5 test cases if needed

PHASE 2 — Integration
  [2.1] {{FILE/MODULE}}     — depends on: [1.x]
  [2.2] {{FILE/MODULE}}     — depends on: [1.x], [2.1]

  📌 SPEC NOTES — mid-phase observations (non-blocking, resolve at gate)
  | Date       | Author   | Ref              | Type          | Observation            | Gate Action                          |
  |------------|----------|------------------|---------------|------------------------|--------------------------------------|
  | {{YY-MM-DD}} | {{WHO}} | ADR-N / Section X | `OBSERVATION` | {{What was found}}     | Update spec / New ADR / Investigate  |

  Gate: {{CONDITION_TO_PASS_PHASE_2}}
        + SUCCESS CRITERIA signals from Section 1: all pass
        + LEARNING LOOP — answer and produce artifacts before advancing:
          Q1: What did this implementation phase reveal that the spec did not anticipate?
              → Artifact: update CONTRACTS/BLUEPRINT or create new ADR (or write "none")
          Q2: Have any decisions with CONFIDENCE = LOW been validated or falsified?
              → Artifact: update Confidence tag + VALIDATION TARGET in related ADR
          Q3: [Only if this phase has production exposure] Do the observed failure patterns
              match the current Proof Standard?
              → Artifact: update Component Registry + Section 5 test cases if needed

PHASE N — {{PHASE_NAME}}
  [N.x] {{FILE/MODULE}}

  📌 SPEC NOTES — mid-phase observations (non-blocking, resolve at gate)
  | Date       | Author   | Ref              | Type          | Observation            | Gate Action                          |
  |------------|----------|------------------|---------------|------------------------|--------------------------------------|
  | {{YY-MM-DD}} | {{WHO}} | ADR-N / Section X | `OBSERVATION` | {{What was found}}     | Update spec / New ADR / Investigate  |

  Gate: {{CONDITION_TO_PASS}}
        + LEARNING LOOP — answer and produce artifacts before advancing (see format above)
```

> ⚠️ Phase gate DOES NOT pass if:
> - `STRICT`/`CRITICAL` component lacks failure-condition tests (see Section 2 + Section 5)
> - SUCCESS CRITERIA signals (Section 1) have not been verified in the final phase
> - Spec does not reflect reality (Spec-is-Primary Rule — see README.md)
> - Learning Loop has not been responded to — 3 questions lack corresponding artifacts
> - A SPEC NOTE has existed for over 1 phase without a Learning Loop response (see SPEC NOTE table in phase above)
> - Scope Boundary Log has a Review Status still `🔄 Pending` (see Section 1)

**Complete file scaffold:**

```
{{PROJECT_ROOT}}/
│
├── {{FILE_1}}               ← created in phase [{{X.Y}}] · DPS anchor: BLUEPRINT §5 {{COMP}} / ADR-{{N}}
├── {{FILE_2}}               ← created in phase [{{X.Y}}] · DPS anchor: CONTRACTS Ref<{{SCHEMA}}>
│
├── {{MODULE_1}}/
│   ├── {{FILE_3}}           ← created in phase [{{X.Y}}] · DPS anchor: BLUEPRINT §5 {{COMP}}.{{function}}
│   └── {{FILE_4}}           ← created in phase [{{X.Y}}] · DPS anchor: CONTRACTS Section {{N}}
│
└── {{MODULE_2}}/
    └── {{FILE_5}}           ← created in phase [{{X.Y}}]
```

---

## 9. OBSERVABILITY

> Spec logging, metrics, and tracing so agents can generate code with correct instrumentation from the start.
> Event/metric names are contracts with the monitoring platform — changing a name is a breaking change.

📝 **FILL-IN**

### Log Events

> Every important event needs to be logged with the correct level and fields.
> Fields in the "Do not log" column are sensitive — agents absolutely must not include them in logs.

| Event | Level | Emitted by | Required fields | Do not log |
|---|---|---|---|---|
| `{{EVENT_1}}` | INFO | `{{COMP}}` | `{{field_a}}`, `{{field_b}}` | `{{SENSITIVE_FIELD}}` |
| `{{EVENT_2}}` | WARN | `{{COMP}}` | `{{field_a}}`, `error.code` | — |
| `{{EVENT_3}}` | ERROR | `{{COMP}}` | `{{field_a}}`, `error.code`, `error.trace` | `{{SENSITIVE_FIELD}}` |

> **Standard log format (JSON structured logging):**
> ```
> {
>   "timestamp"  : "{{ISO_8601}}",
>   "level"      : "{{INFO/WARN/ERROR}}",
>   "event"      : "{{EVENT_NAME}}",       // from table above, stable — do not arbitrarily change name
>   "component"  : "{{COMP}}",
>   "trace_id"   : "{{ID}}",              // to correlate with distributed traces
>   "span_id"    : "{{ID}}",
>   ...fields                              // from "Required fields" column
> }
> ```

### Metrics

> Metrics to monitor SLAs defined in Section 7 (Performance).
> Metric names must be stable — changing a name is a breaking change for dashboards and alert rules.

| Metric name | Type | Unit | Emitted by | Labels | Alert threshold | ADR Ref |
|---|---|---|---|---|---|---|
| `{{METRIC_1}}` | counter | — | `{{COMP}}` | `{{label_1}}`, `{{label_2}}` | — | — |
| `{{METRIC_2}}` | histogram | ms | `{{COMP}}` | `{{label}}` | P99 > {{N}}ms → WARN | ADR-{{N}} |
| `{{METRIC_3}}` | gauge | — | `{{COMP}}` | — | < {{N}} → FATAL | ADR-{{N}} |

> **Metric types:**
> - `counter`   — only increases (number of requests, errors, retries)
> - `histogram` — latency distribution, payload size
> - `gauge`     — value at measurement time (queue depth, active connections, cache size)
>
> **ADR Ref:** Which ADR contains the assumption related to this metric.
> When a metric alerts constantly, readers instantly know which ADR to check to re-evaluate the Confidence tag.
> Fill in `—` if the metric is not tied to a specific assumption in an ADR.
> This bridges Arc 1 (Observability) → Arc 2 (Health): alert breach = evidence the assumption is failing.

### Distributed Traces

> Create spans at every I/O boundary to trace end-to-end latency.

📝 **FILL-IN** *(skip if not using distributed tracing)*

```
SPAN created at:
  - Every inbound request into the system        → ROOT SPAN
  - Every external service call                  → CHILD SPAN
  - Every database / cache call                  → CHILD SPAN
  - {{OTHER_BOUNDARY}}                           → CHILD SPAN

Mandatory SPAN attributes:
  - {{ATTR_1}} : {{VALUE_AND_SOURCE}}
  - {{ATTR_2}} : {{VALUE_AND_SOURCE}}
  - error      : true + error.message if operation fails

DO NOT create spans for: {{PURE_COMPUTATION / IN_MEMORY_OPS}} — overhead is not worth it
```
