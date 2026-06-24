# DPS — Design Proof Specification
> **DPS VERSION:** `5.0-template`
> **DPS PROFILE:** `DPS-Standard` *(choose: `DPS-Lite` / `DPS-Standard` / `DPS-Critical`)*
### {{PROJECT_NAME}} · v{{VERSION}} · compatible with: [CONTRACTS v{{X}}, BLUEPRINT v{{Y}}, ADR v{{Z}}]
> Specification precise enough to create a **proof-ready pre-code architecture artifact** —
> then promoted to an **implementation SSOT** and lives on as the **living spec** of the project.


> **DPS STATUS:** `DRAFT` *(choose: `DRAFT` / `PROOF-READY` / `APPROVED-SSOT` / `IMPLEMENTATION-ACTIVE` / `LIVING-SPEC` / `SUPERSEDED`)*
> **PROMOTED BY:** {{WHO}} · **PROMOTED AT:** {{YYYY-MM-DD}}
> **PROMOTION BASIS:** {{review / stress-test / spike / audit / validation evidence}}
> **CURRENT AUTHORITY:** `DPS` *(default template value)* — if not `DPS`, state the reason and scope.
>
> **Rule:** `DRAFT` must not be used as an implementation source for agents. Only `APPROVED-SSOT`, `IMPLEMENTATION-ACTIVE`, or `LIVING-SPEC` hold implementation authority.
---

## Four canonical files, four responsibilities

| File | Answers the question | When to use | Ownership |
|---|---|---|---|
| `README.md` | **According to what rules?** — Lifecycle, governance, promotion, sync policy | Promote DPS; audit process; route agents | Governance canonical |
| `CONTRACTS.md` | **What?** — Types, schemas, I/O contracts | Design data model; spot type bugs; generate types/interfaces | Contract canonical |
| `BLUEPRINT.md` | **How?** — Behavior, pseudocode, state machine | Implement logic; verify correctness; generate code | Behavior canonical |
| `ADR.md` | **Why?** — Decisions, alternatives, trade-offs | Iterate architecture; onboard newcomers; review with team | Decision canonical |

> **Canonical ownership rule:** Only the 4 files above are manually edited. `DPS_INDEX.yml`, `.agent/*`, and `.dps/DPS_LOCK.yml` are generated sidecars. If a sidecar conflicts with a canonical file, the canonical file wins and you must re-run `./tools/dps.py sync`.

---

## The Two Arcs of DPS

**Arc 1 — Proof at t=0:** *"Is this design correct at the time of writing?"*

Arc 1 runs once. CONTRACTS.md, BLUEPRINT.md, and ADR.md all serve Arc 1 — turning initial intent into near-code artifacts, specific enough to proof/stress-test before building. DPS **does not prescribe the proof method**; it creates objects clear enough for humans/tools/AI to verify.

**Arc 2 — Living Proof (t > 0):** *"Is this design still correct after implementation has begun?"*

Arc 2 runs continuously. Four mechanisms maintain proof validity over time — and they have a dependency order:

| Mechanism | File | Answers | Dependency |
|---|---|---|---|
| Confidence & Volatility | `ADR.md` | Which part of the proof needs more evidence? | Must exist before the Learning Loop has anything to update |
| Learning Loop | `BLUEPRINT.md` Section 8 | What needs to be updated in the proof when implementation reveals new info? | Must run before Spec Health Signals have anything to check |
| Spec Health Signals | README.md (DPS Maintenance Cadence) | Is the proof drifting away from reality? | Depends on Confidence tags from ADRs |
| Scope Boundary Log | `BLUEPRINT.md` Section 1 | Is the problem being proven changing on its own? | Orthogonal — independent but connected via IMPACT RADIUS |

> **Test every Arc 2 mechanism:** *"Does this mechanism help maintain proof validity over time?"*
> If not → it is unnecessary, no matter how intellectually interesting it is.

Arc 1 runs once. Arc 2 runs continuously. Arc 1 creates a proof-ready target portrait at t=0. Arc 2 maintains the validity of that portrait as time passes and implementation exposes reality.

---

## DPS Lifecycle Status — from intent to living spec

DPS is not a static document. A DPS artifact goes through the following living states:

| Status | Meaning | Who can use it? | Gate for transition |
|---|---|---|---|
| `DRAFT` | Specifying intent; missing parts or untested | Researcher / architect | Fill in intent, contracts, blueprint, minimal ADRs |
| `PROOF-READY` | Concrete enough to proof/stress-test almost like code | Reviewer / auditor / AI critique tool | Proof Handoff targets checked and blockers resolved |
| `APPROVED-SSOT` | Passed review/stress-test; becomes the single source of truth for implementation | Dev / coding agent / reviewer | Promotion Basis documented; known risks accepted or resolved |
| `IMPLEMENTATION-ACTIVE` | Being implemented according to Section 8 build phases | Dev / coding agent | Phase gates + Learning Loop running continuously |
| `LIVING-SPEC` | Has reality feedback; spec reflects implementation, metrics, incidents, changes | Team / maintainer / agent | Arc 2 cadence operational; stale evidence updated |
| `SUPERSEDED` | No longer the active truth | For historical reference only | Points to the replacing DPS/ADR |

### Promotion Gate

> **Promotion moment:** DPS is only promoted from `PROOF-READY` to `APPROVED-SSOT` when the blockers in the Proof Handoff have been addressed or explicitly accepted.
> Do not feed a `DRAFT` DPS to a coding agent as implementation authority.

---

## Core Principles

**1. Single definition**
Every type/schema is defined **exactly once** in CONTRACTS.md.
BLUEPRINT.md only uses `Ref<SchemaName>` — no redefinition, no copying.
This prevents `CategoryScore`-class bugs.

**2. Explicit references**
When BLUEPRINT.md needs a schema, it writes `Ref<SchemaName>`.
When two places use the same name → ensure they reference the same definition.

**3. Pseudocode is a contract**
Pseudocode in BLUEPRINT.md is detailed enough for an agent to implement without asking questions.
If an agent still needs to ask → the pseudocode lacks detail.

**4. ADR is memory**
Every "weird looking" decision has an ADR explaining it.
When you want to change the design → read the ADR first to understand why the current design is what it is.

**5. Lifecycle authority**
DPS has varying authority based on status. `DRAFT` is for thinking; `APPROVED-SSOT` is for building; `LIVING-SPEC` is for maintaining.
If the status does not carry enough authority for the current action → do not proceed, promote or reconcile first.

---

## DPS Profiles

Not every project requires a full DPS with the highest level of ceremony. Choose a profile before writing the spec.

| Profile | When to use | Minimum Requirements |
|---|---|---|
| `DPS-Lite` | Serious prototypes / solo builders / spikes that might live on | SYSTEM INTENT, SUCCESS CRITERIA, main schemas, 1-2 ADRs, build phases |
| `DPS-Standard` | Product features / internal systems / multi-agent implementations | Full 4 canonical files, lifecycle status, smell checklist, Learning Loop, Trace Index |
| `DPS-Critical` | Payments, compliance, data loss prevention, outages, revenue-blocking systems | Full Standard + System Invariants, Dependency Fitness, Proof Handoff sign-off, trace anchors |

> Lower profiles must not be used as an excuse to ignore obvious conflicts. A profile only reduces ceremony, not correctness.

---

## Workflow

### When designing (research mode)

```
1. ADR.md       — brainstorm options, weigh trade-offs
2. CONTRACTS.md — define schemas from finalized decisions
3. BLUEPRINT.md — specify behavior using those schemas
4. Loop: find an issue in BLUEPRINT → update CONTRACTS → update ADR if needed
```

### When generating code (build mode)

```
Agents read in this order:
1. CONTRACTS.md  → contains the full type system
2. BLUEPRINT.md  → contains full behavior spec
3. BLUEPRINT.md Section 8 → contains the build order

Agents implement following Phase order in Section 8.
Do not start phase N+1 before passing the gate of phase N.
```

### When iterating architecture

```
0. Before starting: re-read the SYSTEM INTENT block in BLUEPRINT.md Section 1.
   Question: "Does the decision I am about to document align with the PROBLEM and ASSUMING statements?"
   If not: this change might be a response to Intent Drift, not technical refinement
   → see Trigger 0 in the DPS Maintenance Cadence below.

1. Create a new ADR with status PROPOSED
2. List options, pros/cons
3. Finalize → update status to ACCEPTED
4. Update CONTRACTS.md if schema changes (log in Schema Changelog)
5. Update BLUEPRINT.md if behavior changes
6. If the scope of the problem changes → append an entry to the Scope Boundary Log
   (BLUEPRINT.md Section 1) with Impact ADRs and Review Status
7. Breaking change → bump the version across all 4 canonical files (see Version Sync Rule below)
```

### Spec-is-Primary Rule

```
DPS is the SSOT. When implementation conflicts with spec — spec wins.

When detecting a conflict:
  1. Stop implementing
  2. Decide: is the spec correct or is reality correct?
     ├─ Spec is correct  → fix code
     └─ Reality is correct → update DPS first (CONTRACTS / BLUEPRINT / ADR as needed)
  3. Continue implementing following the reconciled spec

DO NOT implement a workaround and say "I'll backfill the spec later" — backfills never happen.
The phase gate in Section 8 does not pass if the spec does not reflect reality.
```


### Change Classification Protocol

Before modifying DPS or code upon encountering a conflict, classify the change. No classification → no modification.

| Type | When to use | Mandatory Action |
|---|---|---|
| `IMPLEMENTATION BUG` | Code is wrong compared to the active DPS authority | Fix code; DPS remains unchanged |
| `SPEC BUG` | DPS is missing/wrong/contradictory, but original decision holds | Update CONTRACTS/BLUEPRINT; add SPEC NOTE or changelog entry if needed |
| `DESIGN CHANGE` | Approach/architecture decision changed | Create new ADR or supersede old ADR; cascade review Impact Radius |
| `INTENT DRIFT` | PROBLEM/FOR/ASSUMING/WILL_DRIFT_IF changed | Update SYSTEM INTENT + Scope Boundary Log; review impacted ADRs |
| `EXTERNAL CONSTRAINT CHANGE` | Library/API/vendor/regulation/platform constraint changed | Update External Contract / Dependency Fitness / ADR Confidence |

> If unsure what type: treat as `SPEC BUG` temporarily, log a SPEC NOTE, and do not advance the phase gate until the Learning Loop responds.

### Version Sync Rule

```
Breaking change in any file  →  bump MAJOR version across all 4 canonical files simultaneously.
Non-breaking addition        →  bump minor version of that file + log in Schema Changelog.

Header of each file must read:
  v{{VERSION}} · compatible with: [CONTRACTS v{{X}}, BLUEPRINT v{{Y}}, ADR v{{Z}}]

"Breaking changes" include:
  - Deleting or renaming a field/schema in CONTRACTS.md
  - Changing an operation signature or pre/post-conditions in BLUEPRINT.md
  - ADR SUPERSEDED leading to a change in active behavior
  - Scope Boundary Log entry impacting multiple ADRs where Review Status is still Pending
```

---

## Agent Context Pack

### Sync-Enforced Sidecars

Sidecars exist for agents/tools to read quickly, but they are not the canonical truth.

**Generated outputs:**

```
DPS_INDEX.yml
.agent/AGENTS.md
.agent/CONTEXT.md
.agent/INVARIANTS.md
.agent/STACK.md
.agent/TASKS.md
.agent/REVIEW_CHECKS.md
.dps/DPS_LOCK.yml
```

**Rule:** do not manually edit generated files. All changes must go through the pipeline:

```bash
# 1. Edit only canonical DPS files
$EDITOR README.md CONTRACTS.md BLUEPRINT.md ADR.md

# 2. Regenerate projections
./tools/dps.py sync

# 3. Verify generated sidecars and cross-canonical consistency
./tools/dps.py check
./tools/dps.py lint --strict
```

`./tools/dps.py check` must fail if:

- canonical metadata drifts across the 4 files;
- `Ref<X>` does not resolve to a schema in `CONTRACTS.md`;
- ADR reference does not exist in `ADR.md`;
- a generated sidecar has been manually edited or hasn't been regenerated;
- `.dps/DPS_LOCK.yml` does not match the canonical/generated hashes.

**Template mode vs project mode:** the blank template is allowed to contain `{{placeholder}}`s and `DRAFT`. When instantiating it as an actual project DPS, run with:

```bash
./tools/dps.py lint --strict --project-mode
```

Project mode will fail if placeholders remain or if the DPS is still `DRAFT`.

### Stable ID markers for deterministic extraction

The parser prioritizes stable markers if they exist; if there are no markers, the tool falls back to heading/table heuristics. When instantiating a real project, consider adding markers to important entities to reduce ambiguity when headings are renamed.

```md
<!-- dps:id=schema.UserProfile -->
<!-- dps:type=schema -->

<!-- dps:id=invariant.email_verified_before_checkout -->
<!-- dps:type=invariant -->

<!-- dps:id=component.CheckoutService -->
<!-- dps:type=component -->

<!-- dps:id=dependency.stripe_sdk -->
<!-- dps:type=dependency -->

<!-- dps:id=external.stripe_api -->
<!-- dps:type=external_contract -->

<!-- dps:id=ADR-003 -->
<!-- dps:type=adr -->
```

Stable IDs are a contract with the tooling. Changing a title/heading is fine, but changing a `dps:id` is a breaking change and requires an ADR if it is already in use by the implementation.


DPS is the canonical source. `.agent/` is merely a generated projection that helps coding agents load correct context based on their mode without having to read the entire spec every time.

```
DPS/                       ← Hand-editable canonical truth
  README.md                 Governance, lifecycle, promotion, sync policy
  CONTRACTS.md              Schemas, I/O contracts, external contracts
  BLUEPRINT.md              Behavior, components, phases, dependencies
  ADR.md                    Decisions, alternatives, rationale

Generated sidecars          ← Never edit by hand
  DPS_INDEX.yml             Machine-readable index
  .agent/AGENTS.md          Agent behavior contract
  .agent/CONTEXT.md         Compressed active truth
  .agent/INVARIANTS.md      Extracted from CONTRACTS Section 3.X
  .agent/STACK.md           Extracted from Dependency Fitness Registry
  .agent/TASKS.md           Extracted from BLUEPRINT Section 8
  .agent/REVIEW_CHECKS.md   Extracted from README Smell Indicators
  .dps/DPS_LOCK.yml         Hash lock against drift

Tooling
  tools/dps.py              sync / check / lint / doctor

> Tooling note: `./tools/dps.py check` already runs strict lint internally. Use `lint --strict` separately only when you want lint output without generated-file diff.
  .pre-commit-config.yaml   local gate
  .github/workflows/        CI gate
```

**Load profile by mode:**

| Agent mode | Agent must read before modifying code |
|---|---|
| `design-review` | README lifecycle + Proof Handoff + ADR index + Trace Index |
| `implementation` | CONTRACTS → BLUEPRINT Section 5/8 → relevant ADRs |
| `refactor` | Component Registry → ADR Origin → System Invariants → Impact Radius |
| `bugfix` | Error Registry → Component Spec → Tests → relevant ADRs |
| `architecture-change` | SYSTEM INTENT → Scope Boundary Log → ADR template → Change Classification |
| `dependency-change` | Dependency Fitness Registry → External Contracts → relevant ADRs |

> Projection rule: if `.agent/` or `DPS_INDEX.yml` conflicts with canonical DPS, the canonical file wins. After canonical changes, run `./tools/dps.py sync && ./tools/dps.py check` before the agent continues implementing.

---

## DPS Maintenance Cadence

DPS has two types of triggers — event-based (embedded within the files) and time-based (this section).
Time-based triggers are an Arc 2 mechanism for detecting proof drift before it becomes a blindside.
This is governance content, not spec content — so it belongs in the README, not BLUEPRINT or CONTRACTS.

### Trigger 0 — System Intent drift *(introduced in v4, retained in v5)*

If any condition in `WILL_DRIFT_IF` of BLUEPRINT.md Section 1 (SYSTEM INTENT block)
has occurred → the entire DPS requires re-evaluation, not just impacted ADRs.
Track this via the Scope Boundary Log (BLUEPRINT.md Section 1) — but clearly note that this is **INTENT DRIFT**,
not an ordinary scope change. INTENT DRIFT = the underlying assumption about the problem is wrong, not just an expanding scope.

### ⚠️ Arc 2 Realism Warning

Arc 2 has two tiers with different dependencies on tooling:

- **Tier 1 — no tooling required:** Trigger 0, Trigger 1, Trigger 2, Alert → Confidence cascade.
  This is the **minimum viable Arc 2** — requiring only team discipline.
- **Tier 2 — tooling required:** Trigger 3, Trigger 4.
  **Without tooling → Tier 2 is aspirational, not operative.**
  Explicitly accept this risk, or compensate with a higher frequency of Tier 1 checks.

> **Recommendation:** For teams new to DPS, only commit to Tier 1 initially.
> Add Tier 2 when tooling is ready. Do not pretend Tier 2 is active when tooling is missing.

### Tier 1: Immediately implementable triggers (no tooling required)

**Trigger 1 — External Contract stale**
If `Last verified` in CONTRACTS.md Section 6 > 3 months → schedule a re-verification with the team owning that service.
If behavior has changed → update the Confidence tag in the relevant ADR.

**Trigger 2 — ADR SUPERSEDED has not triggered cascade review**
When an ADR is SUPERSEDED → the entire IMPACT RADIUS of that ADR must be reviewed.
Track this via the **Cascade Review** field in the IMPACT RADIUS block of that ADR (ADR.md).
If `Cascade Review: 🔄 Pending` → the phase gate cannot be advanced.

> **Note:** The Scope Boundary Log (BLUEPRINT.md Section 1) tracks scope *changes*, not ADR superseded events —
> these are two different triggers. Trigger 2 belongs to ADR.md, not BLUEPRINT.md.

### Tier 2: Triggers requiring tooling — Aspirational (operative only when tooling is ready)

**Trigger 3 — Implementation drift from spec**
Signal: git history of the implementation file has changed multiple times but the spec file has not → potential spec drift.
Format tracking: add `Last synced: {{YYYY-MM-DD}}` to the component spec header in BLUEPRINT Section 5.

**Trigger 4 — Test file divergence**
Signal: the test file for a STRICT/CRITICAL component lacks test cases that match the failure-condition tests in Section 5.
Format tracking: add a "Test file" column to the Component Registry once tooling is available.

### Alert → Confidence cascade

When an alert threshold in BLUEPRINT.md Section 9 Metrics is breached repeatedly — this forms the bridge between Arc 1 (Observability) and Arc 2 (Health). A breach pattern = operational evidence that an assumption in an ADR is wrong.

```
Frequent alert breaches
  │
  ▼
Look up Metrics table → ADR Ref column → find relevant ADR
  │
  ▼
Re-evaluate Confidence tag in that ADR:
  ├─ Assumption still holds → update WATCH SIGNAL / VALIDATION TARGET in the ADR
  └─ Assumption is wrong    → downgrade Confidence → create new ADR if a decision change is needed
```

---


## Proof Handoff Interface

DPS does not dictate how to prove/stress-test a design. This section only specifies the **surfaces that must be verified** before promoting `PROOF-READY` → `APPROVED-SSOT`.

| Target | Ref | Why it needs stress-testing | Expected evidence | Blocking? |
|---|---|---|---|---|
| Intent coherence | BLUEPRINT Section 1 | If intent is wrong, the entire target portrait is wrong | Domain review / PRD check / stakeholder review | YES |
| Contract consistency | CONTRACTS Section 3-5 | Schema/I/O conflicts will cascade into code | Manual audit / type model / linter / AI critique | YES |
| Component traceability | BLUEPRINT Section 2 + ADR.md | Components lacking origin easily cause scope creep | ADR Origin coverage review | YES |
| Behavior determinism | BLUEPRINT Section 5 | Agents will implement missing branches if pseudocode is vague | Determinism Check pass | YES |
| Invariant ownership | CONTRACTS Section 3.X + BLUEPRINT Section 5 | Unowned invariants are not enforced | ENFORCE BY ↔ Enforces trace check | YES |
| Dependency fitness | BLUEPRINT Section 7 | Libraries/frameworks might not fit assumptions | Docs check / spike / benchmark / version audit | RISK DEP. |
| Build feasibility | BLUEPRINT Section 8 | Phase dependency conflicts stall implementation | Build-order review / dry-run plan | YES |
| Arc 2 readiness | README Maintenance + BLUEPRINT Section 8/9 | Living specs need signals to update when reality changes | Learning Loop + metrics/alerts refs exist | YES for > prototypes |

**Promotion record:**
```
PROMOTED FROM : PROOF-READY
PROMOTED TO   : APPROVED-SSOT
DATE          : {{YYYY-MM-DD}}
PROMOTED BY   : {{WHO}}
EVIDENCE      : {{links / notes / audit refs}}
ACCEPTED RISK : {{Known unresolved non-blockers, or "none"}}
```

---

## Spec Compaction Rule

Living specs bloat as they age. When DPS exceeds the context budget or agents begin missing context:

1. Do not delete active rationale.
2. Superseded ADRs retain summary + link/history; move details to an archive if necessary.
3. Resolved SPEC NOTEs are compacted into Learning Loop outcomes.
4. Deprecated schema details belong in the Deprecation Registry, do not repeat them in BLUEPRINT.
5. `.agent/CONTEXT.md` only contains active truth, not lengthy history.
6. DPS_INDEX.yml is refreshed after compaction so tooling/agents do not point to old sections.

---

## Checklist before feeding to an agent

**Lifecycle / Promotion**
```
[ ] DPS STATUS is no longer DRAFT if used for implementation
[ ] PROMOTION BASIS clearly documents review/stress-test/spike/audit evidence
[ ] Profile has been selected (`DPS-Lite` / `DPS-Standard` / `DPS-Critical`)
[ ] If status = APPROVED-SSOT or higher, `.agent/` projection has been refreshed from the latest DPS
[ ] If status = LIVING-SPEC, Arc 2 cadence is active and stale evidence is tracked
```

**Arc 1 — Proof at t=0**

🔧 **Mechanical** *(verifiable in < 1 minute — no need to read content)*
```
[ ] All FILL-IN placeholders have been replaced
[ ] No schema is defined in more than one place
[ ] Every Ref<X> in BLUEPRINT.md has an X in CONTRACTS.md
[ ] Every error code in BLUEPRINT.md exists in the Error Registry
[ ] Build order in Section 8 has no circular dependencies
[ ] The 4 canonical files have synchronized version/profile/status/current-authority headers (after breaking changes)
[ ] Every ADR has a fully populated IMPACT RADIUS (component names + schema names)
[ ] No schema/field in a new or edited spec references items in the Deprecation Registry
```

🧠 **Judgment** *(requires reading and thinking — cannot be mechanically checked)*
```
[ ] An ADR exists for every "weird looking" decision
[ ] All operations have pre/post conditions that reflect actual behavior
[ ] All stateful components have a concurrency strategy in BLUEPRINT Section 4
[ ] Every external call has failure modes handled in BLUEPRINT Section 6
[ ] SUCCESS CRITERIA in BLUEPRINT Section 1 are filled out (≤ 3 measurable signals)
[ ] Every STRICT/CRITICAL component → Section 5 has failure-condition tests
[ ] ADR SUPERSEDED → cascade review of all components/schemas in IMPACT RADIUS
```

**Arc 2 — Living Proof (t > 0)**
```
[ ] All ADRs have CONFIDENCE and VOLATILITY populated
[ ] ADRs with CONFIDENCE = LOW → VALIDATION TARGET is populated (not empty)
[ ] ADRs with VOLATILITY = WATCHFUL/VOLATILE → WATCH SIGNAL is populated
[ ] All ADRs have a populated LAST CONFIRMED field — no INITIAL > 3 months with VOLATILE/WATCHFUL
[ ] SCOPE BOUNDARY LOG in BLUEPRINT Section 1 is initialized with an initial entry
[ ] Every scope change entry has its Review Status updated (no long-standing Pending)
[ ] Learning Loop is responded to before every phase transition in Section 8
[ ] Metrics table in BLUEPRINT Section 9 has ADR Refs for metrics linked to assumptions
[ ] External Contracts in CONTRACTS Section 6 have a Last verified date within 3 months
[ ] Dependency Fitness Registry in BLUEPRINT Section 7 has Last verified dates for architecture-relevant dependencies
[ ] DPS_INDEX.yml and `.agent/` projection are refreshed after large changes
```

---

## ⚠️ DPS Smell Indicators

If you notice any of these signs → they must be fixed **before** feeding the agent:

**Lifecycle / Promotion Smells**
```
❌ DPS STATUS = DRAFT but is fed to a coding agent
   as implementation authority               → agent is building from an unpromoted artifact;
                                                promote or clearly mark as exploratory-only

❌ DPS STATUS = APPROVED-SSOT but
   PROMOTION BASIS is empty                  → unclear what was stress-tested;
                                                SSOT authority lacks an evidence trail

❌ `.agent/` projection conflicts with DPS
   canonical files                           → stale agent context;
                                                refresh projection before continuing to implement

❌ Living spec bloats, causing agent to miss
   active constraints                        → needs Spec Compaction Rule;
                                                archive history, keep active truth compact
```

**Arc 1 — Proof Validity Smells**
```
❌ Agent asks questions after reading BLUEPRINT → pseudocode is insufficiently detailed (Rule 3)
❌ Found the same schema name in 2 different places → Single Definition violation (Rule 1)
❌ Ref<X> in BLUEPRINT but X is missing from
   CONTRACTS                                 → broken reference
❌ Operation has side effects but no
   POST-CONDITIONS                           → contract is incomplete
❌ State machine has transitions lacking
   guards/actions                            → underspecified
❌ Phase N depends on Phase N+1              → circular dependency in build order
❌ 4 canonical files have out-of-sync version/profile/status/current-authority
   headers following a breaking change       → version drift (Version Sync Rule)
❌ Stateful component missing a
   concurrency strategy                      → race condition risk (BLUEPRINT Section 4)
❌ Component is STRICT/CRITICAL in Section 2
   but Section 5 lacks failure-condition
   tests                                     → Proof Standard is not enforced
❌ ADR is SUPERSEDED but IMPACT RADIUS has
   not triggered a review of components/schemas → cascade failure risk (blindside attack)

❌ Schema X in CONTRACTS Section 3 but no
   Ref<X> in BLUEPRINT and no
   "External consumer" annotation            → orphaned schema — or external-only schema
                                                unannotated (fix: add External consumer)

❌ Error code E in CONTRACTS Section 5
   but no component in BLUEPRINT Section 5
   has a path triggering E                   → dead error code — E is unimplemented
                                                or was forgotten during refactoring

❌ Component in Section 2 Registry lacks a
   corresponding "### {{COMP}}" section
   in Section 5                              → component is registered but not spec'd;
                                                phase gate cannot be advanced

❌ Component operation in Section 3 Data
   Flow takes Ref<SchemaA> but Section 5
   spec for that operation takes Ref<SchemaB> → schema mismatch between flow diagram and component spec;
                                                agent doesn't know which is SSOT — fix before implementing

❌ DECISION TYPE = COMPARATIVE but "Option B"
   or "Option C" describes an obviously
   infeasible solution in this context       → Dummy Alternative (fabricated option);
                                                change DECISION TYPE or document a real alternative

❌ Schema field comment uses a domain term
   not found in Glossary Section 10          → Ubiquitous Language drift forming;
                                                add the term to Glossary or use the correct term

❌ Schema/field in Deprecation Registry
   is referenced in BLUEPRINT Section 5
   pseudocode of a new component             → using a deprecated artifact in new code;
                                                migrate to replacement field/schema before proceeding

❌ ENFORCE BY component in CONTRACTS Section 3.X
   is removed or renamed without updating
   SYSTEM INVARIANTS                         → invariant lost its owner;
                                                no component enforces it anymore

❌ Architecture-relevant dependency is
   added by an agent to code but is missing
   from Dependency Fitness Registry          → implementation is introducing architecture decisions
                                                outside of DPS

❌ Main module/file lacks a DPS trace
   anchor at an important boundary           → code cannot be mapped back to target portrait;
                                                hard to audit if implementation matches spec
```

**Arc 2 — Living Proof Smells**
```
❌ ADR has CONFIDENCE = LOW but
   lacks a VALIDATION TARGET                 → tag is just a marker with no action path;
                                                LOW decisions accumulate and are never resolved
❌ ADR has VOLATILITY = WATCHFUL/VOLATILE
   but lacks a WATCH SIGNAL                  → meaningless declaration, don't know what to watch
❌ ADR has deep IMPACT RADIUS but
   CONFIDENCE = LOW + VOLATILITY = VOLATILE  → architectural smell: many decisions
                                                depend on a shaky foundation
❌ Scope Boundary Log has a "Pending"
   Review Status for too long                → impacted ADRs haven't been reconciled into the proof;
                                                scope change hasn't propagated
❌ Metrics Alert is breached but lacks an
   ADR Ref in the Metrics table              → unknown which assumption is wrong,
                                                no action path to downgrade Confidence
❌ Phase gate advances without a Learning
   Loop response                             → implementation insights are missed,
                                                proof drift silently accumulates
❌ External Contract has Last verified
   > 3 months with no re-verify plan         → accumulating spec drift risk
❌ Change applied without classification
   under Change Classification Protocol      → unclear whether to fix code, update spec, create ADR,
                                                or treat as intent drift

❌ ADR has LAST CONFIRMED: INITIAL and date
   > 3 months while VOLATILITY =
   VOLATILE or WATCHFUL                      → stale confidence; this assumption has not been validated
                                                by implementation, metrics, or any review —
                                                downgrade Confidence or schedule explicit validation
```
