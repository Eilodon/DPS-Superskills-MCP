# ADR.md — Architecture Decision Records
> **DPS VERSION:** `5.0-template`
> **DPS PROFILE:** `DPS-Standard` *(choose: `DPS-Lite` / `DPS-Standard` / `DPS-Critical`)*
### {{PROJECT_NAME}} · v{{VERSION}} · compatible with: [CONTRACTS v{{X}}, BLUEPRINT v{{Y}}]

> **Purpose of this file:** To document *why* the system is designed this way.
> Not *what* (CONTRACTS.md) or *how* (BLUEPRINT.md) — but *why*.
>
> This file is the research layer — where design iteration, alternative evaluation, and trade-offs are recorded.
> When reading again 6 months later, this file should explain any "strange-looking" decisions in the codebase.


> **DPS STATUS:** `DRAFT` *(choose: `DRAFT` / `PROOF-READY` / `APPROVED-SSOT` / `IMPLEMENTATION-ACTIVE` / `LIVING-SPEC` / `SUPERSEDED`)*
> **PROMOTED BY:** {{WHO}} · **PROMOTED AT:** {{YYYY-MM-DD}}
> **PROMOTION BASIS:** {{review / stress-test / spike / audit / validation evidence}}
> **CURRENT AUTHORITY:** `DPS` *(default template value)* — if not `DPS`, specify the reason and scope.
>
> **Rule:** `DRAFT` must not be used as an implementation source for agents. Only `APPROVED-SSOT`, `IMPLEMENTATION-ACTIVE`, or `LIVING-SPEC` hold implementation authority.
---

## Table of Contents

> Update this table whenever a new ADR is created.

| ADR | Title | Status | CONFIDENCE | DECISION TYPE | Tags |
|---|---|---|---|---|---|
| [ADR-001](#adr-001) | {{NAME}} | ✅ ACCEPTED | `HIGH` | `COMPARATIVE` | `{{TAG}}` |
| [ADR-002](#adr-002) | {{NAME}} | ✅ ACCEPTED | `MEDIUM` | `COMPARATIVE` | `{{TAG}}` |
| 📝 | Add when creating new ADR | | | | |

> **Why the CONFIDENCE column is needed here:**
> When triaging "which ADR needs review first?", filter for `LOW` confidence ADRs —
> the most fragile decisions that require the most attention as the system evolves.
>
> **Why the DECISION TYPE column is needed here:**
> When onboarding newcomers, this helps them know which ADR has deliberative alternatives (COMPARATIVE)
> vs. which ADR is experience-driven (EXPERIENCE-DRIVEN) to calibrate expectations when reading.

---

## How to read this file

**Status of each ADR:**

| Status | Meaning |
|---|---|
| 🟡 `PROPOSED` | Under consideration, not yet finalized |
| ✅ `ACCEPTED` | Finalized, currently being implemented |
| ❌ `REJECTED` | Considered but not chosen — kept to avoid re-proposing |
| 🔄 `SUPERSEDED by ADR-xxx` | Replaced by another ADR |
| ⏸️ `DEFERRED` | Decision postponed to a later phase |

**CONFIDENCE — level of certainty of the decision at the time of writing:**

| Level | Meaning | Mandatory Addition |
|---|---|---|
| `HIGH` | Sufficient evidence to trust this decision is stable | — |
| `MEDIUM` | Reasonable basis but some uncertainty remains | — |
| `LOW` | Assumption-heavy; must be validated by observable signal | **VALIDATION TARGET required** |

**VOLATILITY — likelihood of the decision changing over time:**

| Level | Meaning | Mandatory Addition |
|---|---|---|
| `STABLE` | Unlikely to change; foundational decisions | — |
| `WATCHFUL` | May change if the environment changes | **WATCH SIGNAL required** |
| `VOLATILE` | Highly likely to change as more data is gathered | **WATCH SIGNAL required** |

> **Decision reliability matrix:** CONFIDENCE × VOLATILITY affects how IMPACT RADIUS is read.
> An ADR with `CONFIDENCE = LOW` + `VOLATILITY = VOLATILE` that has a deep IMPACT RADIUS is an **architectural smell** —
> too many decisions are depending on an unstable foundation.
> Consider reducing dependencies or building an isolation layer before proceeding.
>
> LOW + VOLATILE = "high blast radius upon change" — **set `BLAST RADIUS: CRITICAL`** in the IMPACT RADIUS block
> and review carefully before letting the phase gate advance. This is a signal to isolate the risk immediately,
> not just document it and leave it.

**When to create a new ADR:**
- Changes affecting schema or I/O contract (breaking change)
- Choosing between two or more technical approaches
- Decisions regarding security, privacy, or compliance
- Anything that will later make you ask "why did we do this?"

---

<a id="adr-001"></a>

## ADR-001 — {{First Decision Name}}

**Status:** ✅ ACCEPTED
**Date:** {{DATE}}
**Deciders:** {{PERSON/GROUP}}
**Tags:** `{{TAG_1}}` `{{TAG_2}}`
**Change Classification:** `{{DESIGN CHANGE | EXTERNAL CONSTRAINT CHANGE | INTENT DRIFT | SPEC BUG}}` *(see README Change Classification Protocol; `IMPLEMENTATION BUG` does not create an ADR entry as it only fixes code according to current DPS)*
**Review date:** {{DATE}} — re-evaluate when {{TRIGGER_CONDITION}}
**Supersedes:** —                   ← fill if this ADR replaces older ADRs; `—` if not
**Superseded by:** —                ← fill when this ADR is superseded by ADR-N; `—` until it happens

**DECISION TYPE:** `COMPARATIVE`
  *(choose: `COMPARATIVE` / `EXPERIENCE-DRIVEN` / `CONSTRAINT-FORCED` / `CONSENSUS`)*
  *(this type determines the format of "Options Considered" — see instructions at the end of the file)*

**CONFIDENCE :** `HIGH` *(or MEDIUM / LOW)* — {{REASON_FOR_CONFIDENCE_LEVEL}}
  → *(Required if LOW)* **VALIDATION TARGET:** {{specific, measurable signal — upon encountering this signal, Confidence must be updated}}
**LAST CONFIRMED:** {{YYYY-MM-DD}} — `INITIAL`
  *(upgrade to: `IMPLEMENTATION` / `METRICS` / `REVIEW` when confidence is validated — see instructions at the end of the file)*

**VOLATILITY :** `STABLE` *(or WATCHFUL / VOLATILE)* — {{REASON_FOR_STABILITY}}
  → *(Required if WATCHFUL/VOLATILE)* **WATCH SIGNAL:** {{trigger condition — when to re-evaluate this decision}}

### Context

📝 **FILL-IN:** Describe the problem to be solved and the technical context.
Focus on: constraints, forces, requirements leading to this decision.

{{CONTEXT_AND_PROBLEM_DESCRIPTION}}

**Constraints:**
- {{CONSTRAINT_1}}
- {{CONSTRAINT_2}}

**Requirements:**
- {{REQUIREMENT_1}}
- {{REQUIREMENT_2}}

### Options Considered

📝 **FILL-IN:** List all considered options — including the rejected ones.
For each option: pros, cons, and reason for rejection or selection.

#### Option A: {{OPTION_A_NAME}} ← **CHOSEN**

```
Description: {{TECHNICAL_DESCRIPTION}}
```

| Pros | Cons |
|---|---|
| {{PRO_1}} | {{CON_1}} |
| {{PRO_2}} | {{CON_2}} |

#### Option B: {{OPTION_B_NAME}}

```
Description: {{TECHNICAL_DESCRIPTION}}
```

| Pros | Cons |
|---|---|
| {{PRO_1}} | {{CON_1}} |
| {{PRO_2}} | {{CON_2}} |

**Rejected because:** {{SHORT_REJECTION_REASON}}

#### Option C: {{OPTION_C_NAME}}

**Rejected because:** {{REJECTION_REASON}}

### Decision

> **Chose Option A because:** {{REASON_FOR_CHOICE — connect directly to the constraints and requirements above}}

### Impact

📝 **FILL-IN:** Fill this in after the decision is ACCEPTED.

**Changed schemas:** `{{SCHEMA_1}}` (added field), `{{SCHEMA_2}}` (renamed)
**Changed components:** `{{COMP_A}}`, `{{COMP_B}}`
**Breaking change:** YES/NO — see Schema Changelog v{{X.Y}}

**IMPACT RADIUS:**
```
BLAST RADIUS : {{CONTAINED / MODERATE / WIDE / CRITICAL}}
               // CRITICAL   — CONFIDENCE=LOW + VOLATILITY=VOLATILE + cascade chain ≥ 3 hops
               // WIDE       — multiple components/schemas affected, cascade ≥ 2 hops
               // MODERATE   — a few components, cascade 1 hop
               // CONTAINED  — impact limited to 1 component, no schema breaking change

Cascades   : {{COMP_A}} → {{COMP_B}} → {{COMP_C_OR_EXTERNAL}}
             // e.g.: PaymentProcessor → NotificationService → EmailGateway

Schema deps: `{{SCHEMA_1}}` — consumed by: {{COMP_A}}, {{COMP_B}}
             `{{SCHEMA_2}}` — consumed by: {{COMP_C}}

⚠️ When this ADR is SUPERSEDED → mandatory review triggered:
   Components : {{COMP_A}}, {{COMP_B}}          // use names — not section numbers
   Schemas    : `{{SCHEMA_1}}`, `{{SCHEMA_2}}`  // names are contracts; section numbers change as the template evolves
   Cascade Review: 🔄 Pending                   // update to ✅ Done when all items are reviewed
                                                 // or ⚠️ OVERRIDE: {{reason}} if accepting risk
```

### Consequences

**Positive:**
- {{GOOD_CONSEQUENCE_1}}
- {{GOOD_CONSEQUENCE_2}}

**Negative / Acceptable Trade-offs:**
- {{TRADE_OFF_1}} — accepted because {{REASON}}
- {{TRADE_OFF_2}} — will revisit in {{PHASE/VERSION}}

**Risks:**
- {{RISK_1}} — mitigated by {{METHOD}}
- {{RISK_2}} — trigger review if {{CONDITION}}

### Implementation Notes

📝 **FILL-IN:** Special notes to keep in mind when implementing this decision.
This is the bridge from "why" to "how" — it does not duplicate BLUEPRINT.md
but provides context to understand the intent properly when reading BLUEPRINT.md.

- {{IMPL_NOTE_1}}
- {{IMPL_NOTE_2}}

**See also:** BLUEPRINT.md Section {{N}}, CONTRACTS.md `{{SCHEMA}}`

---

<a id="adr-002"></a>

## ADR-002 — {{Decision Name}}

**Status:** ✅ ACCEPTED
**Date:** {{DATE}}
**Deciders:** {{PERSON/GROUP}}
**Tags:** `{{TAG}}`
**Change Classification:** `{{DESIGN CHANGE | EXTERNAL CONSTRAINT CHANGE | INTENT DRIFT | SPEC BUG}}` *(see README Change Classification Protocol; `IMPLEMENTATION BUG` does not create an ADR entry as it only fixes code according to current DPS)*
**Review date:** {{DATE}} — re-evaluate when {{TRIGGER_CONDITION}}
**Supersedes:** —
**Superseded by:** —

**DECISION TYPE:** `COMPARATIVE`
  *(choose: `COMPARATIVE` / `EXPERIENCE-DRIVEN` / `CONSTRAINT-FORCED` / `CONSENSUS`)*

**CONFIDENCE :** `HIGH` *(or MEDIUM / LOW)* — {{REASON_FOR_CONFIDENCE_LEVEL}}
  → *(Required if LOW)* **VALIDATION TARGET:** {{specific, measurable signal — upon encountering this signal, Confidence must be updated}}
**LAST CONFIRMED:** {{YYYY-MM-DD}} — `INITIAL`
  *(upgrade to: `IMPLEMENTATION` / `METRICS` / `REVIEW` when validated)*

**VOLATILITY :** `STABLE` *(or WATCHFUL / VOLATILE)* — {{REASON_FOR_STABILITY}}
  → *(Required if WATCHFUL/VOLATILE)* **WATCH SIGNAL:** {{trigger condition — when to re-evaluate this decision}}

### Context

{{DESCRIPTION}}

### Options Considered

#### Option A: {{NAME}} ← **CHOSEN**

| Pros | Cons |
|---|---|
| {{PRO}} | {{CON}} |

#### Option B: {{NAME}}

**Rejected because:** {{REASON}}

### Decision

> **Chose Option A because:** {{REASON}}

### Impact

**Changed schemas:** `{{SCHEMA}}` ({{CHANGE_TYPE}})
**Changed components:** `{{COMP}}`
**Breaking change:** YES/NO — see Schema Changelog v{{X.Y}}

**IMPACT RADIUS:**
```
BLAST RADIUS : {{CONTAINED / MODERATE / WIDE / CRITICAL}}

Cascades   : {{COMP}} → {{DOWNSTREAM}}
Schema deps: `{{SCHEMA}}` — consumed by: {{COMP}}, {{OTHER_COMP}}

⚠️ When this ADR is SUPERSEDED → mandatory review triggered:
   Components : {{COMP}}
   Schemas    : `{{SCHEMA}}`
   Cascade Review: 🔄 Pending   // update to ✅ Done or ⚠️ OVERRIDE: {{reason}}
```

### Consequences

**Positive:** {{CONSEQUENCE}}
**Trade-offs:** {{TRADE_OFF}}

---

## ADR-{{N}} — Template (copy when creating a new ADR)

**Status:** 🟡 PROPOSED
**Date:** {{DATE}}
**Deciders:** {{PERSON/GROUP}}
**Tags:** `{{TAG}}`
**Change Classification:** `{{DESIGN CHANGE | EXTERNAL CONSTRAINT CHANGE | INTENT DRIFT | SPEC BUG}}` *(see README Change Classification Protocol; `IMPLEMENTATION BUG` does not create an ADR entry as it only fixes code according to current DPS)*
**Review date:** {{DATE}} — re-evaluate when {{TRIGGER_CONDITION}}
**Supersedes:** —                   ← fill if this ADR replaces an older ADR
**Superseded by:** —                ← fill when superseded

**DECISION TYPE:** `COMPARATIVE`
  *(choose: `COMPARATIVE` / `EXPERIENCE-DRIVEN` / `CONSTRAINT-FORCED` / `CONSENSUS`)*
  *(this type determines the format of the "Options Considered" section below —
   see "Decision Type Format Variants" at the end of the file to copy the appropriate format)*

**CONFIDENCE :** `HIGH` *(or MEDIUM / LOW)*
  → *(Required if LOW)* **VALIDATION TARGET:** *(fill in specific, measurable signal)*
**LAST CONFIRMED:** {{YYYY-MM-DD}} — `INITIAL`
  *(fill in the date this ADR was written; upgrade type when confidence is validated)*

**VOLATILITY :** `STABLE` *(or WATCHFUL / VOLATILE)*
  → *(Required if WATCHFUL/VOLATILE)* **WATCH SIGNAL:** *(fill in trigger condition)*

### Context

{{DESCRIPTION}}

### Options Considered

> **The format of this section changes based on DECISION TYPE:**
> - `COMPARATIVE` → keep Option A/B/C format below
> - `EXPERIENCE-DRIVEN` → delete this section, replace with **Evidence Base** (see end of file)
> - `CONSTRAINT-FORCED` → delete this section, replace with **Constraint Analysis** (see end of file)
> - `CONSENSUS` → delete this section, replace with **Consensus Basis** (see end of file)
>
> *Dummy Alternative anti-pattern: if DECISION TYPE = COMPARATIVE, ensure the alternatives
> were actually considered — do not construct fake options just for appearance (see Smell Indicators in README.md).*

#### Option A: {{NAME}}

| Pros | Cons |
|---|---|
| | |

#### Option B: {{NAME}}

| Pros | Cons |
|---|---|
| | |

### Decision

> **Chose ... because:**
> If this ADR promotes an artifact to SSOT or supersedes an old decision, clearly state the lifecycle impact.

### Impact

**Changed schemas:** *(fill after ACCEPTED)*
**Changed components:** *(fill after ACCEPTED)*
**Breaking change:** YES/NO — see Schema Changelog v{{X.Y}}

**IMPACT RADIUS:**
```
BLAST RADIUS : {{CONTAINED / MODERATE / WIDE / CRITICAL}}
               // CRITICAL when CONFIDENCE=LOW + VOLATILITY=VOLATILE + deep cascade chain

Cascades   : *(fill after ACCEPTED — trace affected dependency chain)*
Schema deps: *(which schemas changed and who consumes them)*

⚠️ When this ADR is SUPERSEDED → mandatory review triggered:
   Components : *(fill component names — not section numbers)*
   Schemas    : *(fill schema names)*
   Cascade Review: 🔄 Pending   // update to ✅ Done or ⚠️ OVERRIDE: {{reason}}
```

### Consequences

**Positive:**
**Trade-offs:**
**Risks:**

---

## Decision Type Format Variants

> This section is for reference — not actual ADR content.
> When creating a new ADR with DECISION TYPE ≠ COMPARATIVE:
> 1. Copy the corresponding section below
> 2. Use it to replace "Options Considered" in the ADR
> 3. Delete this section from that specific ADR

---

### Variant: EXPERIENCE-DRIVEN — Evidence Base

> Use when: selecting based on direct experience, no real alternatives were evaluated.
> **Do not construct fake alternatives** — instead describe the evidence basis.

```
### Evidence Base

**Direct experience:** {{Project / context that provided the experience — can be general if confidential}}
**Key insight:** {{What from that experience led to this decision}}
**Risk accepted:** {{What could go wrong by not comparing alternatives}}
**Would reconsider if:** {{What condition triggers re-evaluation with proper comparative analysis}}
```

---

### Variant: CONSTRAINT-FORCED — Constraint Analysis

> Use when: there is only 1 viable option due to a hard constraint (vendor lock-in, regulatory, legacy, etc.)

```
### Constraint Analysis

**Binding constraint:** {{Which constraint eliminated all alternatives}}
**Constraint source:** {{Vendor contract / Regulatory / Technical debt / Legacy system}}
**Alternatives ruled out by constraint:**
  - {{ALTERNATIVE_A}} — rejected because this constraint prevents {{SPECIFIC_REASON}}
  - {{ALTERNATIVE_B}} — rejected because {{SPECIFIC_REASON}}
**Constraint review date:** {{When this constraint might change — to know when to reopen the decision}}
```

---

### Variant: CONSENSUS — Consensus Basis

> Use when: team consensus is reached without discrete alternatives.

```
### Consensus Basis

**Agreement basis:** {{Reason for consensus — shared experience / domain knowledge / default best practice}}
**Dissenters acknowledged:** {{Who had reservations — no need for detail, just acknowledge for transparency}}
**Would formally evaluate if:** {{When the team will revisit with formal comparison}}
```

---

## LAST CONFIRMED — Upgrade Guide

> Cross-reference: README Arc 2 checklist explains how `LAST CONFIRMED` freshness is reviewed during living-spec maintenance.


> `LAST CONFIRMED` tracks when and how an ADR was validated after its initial writing.

| Value | Meaning | When to use |
|---|---|---|
| `INITIAL` | Default when writing an ADR. Confidence is an assessment, no evidence yet. | Date the ADR is written |
| `IMPLEMENTATION` | Confidence confirmed by implementation — design works as spec. | After implementing the related phase |
| `METRICS` | Confirmed by actual production metrics. | After having production data (include metric reference) |
| `REVIEW` | Confirmed by explicit team review after a period of time. | After team review (include review context) |

> **Smell:** ADR has `LAST CONFIRMED: INITIAL` and date > 3 months while `VOLATILITY = VOLATILE/WATCHFUL`
> → stale confidence, needs validation or downgrade. See Arc 2 Smell Indicators in README.md.
