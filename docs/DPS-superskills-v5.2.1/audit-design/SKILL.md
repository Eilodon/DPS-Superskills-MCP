---
name: audit-design
description: Use after a spec document contains SPEC_APPROVED=true in its frontmatter, before invoking writing-plans — or when SPEC_ESCALATION=true is set by specialist-review. Runs a FAST risk audit on the design to surface failure modes before any code is written.
---

# Audit-Design — Pre-Implementation Risk Audit

Runs a compressed VHEATM FAST audit on the spec document produced by `brainstorming`.
**Purpose:** find domain risks, failure modes, and blind spots in the design *before*
a single line of code is written. Cheap to fix now. Expensive after implementation.

**Announce:** "I'm using audit-design to run a pre-implementation risk audit."

---

## Trigger Conditions

This skill activates when **either** condition is true:

**Condition A — Normal flow:** spec frontmatter contains `SPEC_APPROVED: true`
(set by `brainstorming` after user approves the design document)

**Condition B — Escalation flow:** spec frontmatter contains `SPEC_ESCALATION: true`
(set by `specialist-review` when a CRITICAL/HIGH finding traces back to a spec-level decision)

In escalation flow, read the `ESCALATION_FINDING` field in the spec before running the audit —
it provides the specific finding that triggered re-review.

---

## Idempotency Check

Before running, check if a risk assessment already exists:

```bash
grep -c "## Risk Assessment (audit-design)" docs/superskills/specs/<spec-file>.md
```

- **Count = 0** → run full audit, append new section.
- **Count ≥ 1 AND normal flow** → check timestamp. If spec was modified after last audit → re-run with `UPDATE` label. If unchanged → skip, log "audit current".
- **Count ≥ 1 AND escalation flow** → always re-run, append as `## Risk Assessment — Escalation (audit-design)` with escalation finding as context. This is a new section, not an overwrite.

---

## DPS Detection

```bash
# Check if DPS is present and status:
DPS_STATUS=$(grep "DPS STATUS:" docs/superskills/DPS_v5/BLUEPRINT.md 2>/dev/null | head -1 | awk '{print $NF}')
echo "DPS STATUS: ${DPS_STATUS:-NOT_PRESENT}"
```

IF DPS_STATUS = DRAFT or PROOF-READY:
  → Run **DPS-Aware Audit** (Section below) IN ADDITION TO standard VHEATM FAST
IF DPS_STATUS = NOT_PRESENT:
  → Run standard VHEATM FAST only (unchanged behavior)
IF DPS_STATUS = APPROVED-SSOT or higher:
  → Idempotency check applies (re-audit only on escalation)

---

## Complexity Gate

Skip and proceed directly to `writing-plans` if ALL of the following are true:
- Spec is < 3 sections AND no external integrations
- No persistent state changes (no DB schema, no file writes, no external API calls)
- No auth, permissions, or user data involved

If any condition fails → run the full audit.

---

## The Audit (VHEATM FAST Steps 1–4, design-adapted)

Read the spec document fully before proceeding.

```bash
# Available specs (auto-injected at skill load):
!ls docs/superskills/specs/*.md 2>/dev/null || echo "No specs found — run brainstorming first"
```


### Step 1: Context Declaration

```
CONTEXT_MODE:      DESIGN
STAKEHOLDER:       [from spec]
GOAL:              pre-mortem before implementation
                   [escalation: re-audit triggered by ESCALATION_FINDING: <finding>]
AUDIT_TARGET_TIER: 1 (MVP) | 2 (Production) | 3 (PII/payments/multi-tenant/regulated)
```

Declare Tier 3 if spec mentions: payments, PII at scale, multi-tenant data, regulated domains.

### Step 2: Pre-mortem — 3 Failure Modes

Generate exactly 3 distinct structural failure modes:

```
Failure Mode 1: [what breaks] → [why the design enables this] → [HIGH/MED/LOW]
Failure Mode 2: [what breaks] → [why the design enables this] → [HIGH/MED/LOW]
Failure Mode 3: [what breaks] → [why the design enables this] → [HIGH/MED/LOW]
```

In escalation flow: the first failure mode must directly address the `ESCALATION_FINDING`.

## DPS-Aware Arc 1 Checks (runs if DPS present)

These checks verify DPS structural correctness — complementary to VHEATM FAST.
Mechanical checks (fast, < 2 min):

```bash
# 1. Single-definition rule: no schema defined in multiple places
grep -rn "^### " docs/superskills/DPS_v5/CONTRACTS.md | awk -F: '{print $NF}' | sort | uniq -d

# 2. Broken Ref<X>: every Ref<X> in BLUEPRINT resolves to CONTRACTS
grep -o "Ref<[^>]*>" docs/superskills/DPS_v5/BLUEPRINT.md | sort | uniq | while read ref; do
  schema=$(echo "$ref" | sed 's/Ref<\(.*\)>/\\1/')
  grep -q "$schema" docs/superskills/DPS_v5/CONTRACTS.md || echo "BROKEN: $ref"
done

# 3. Version sync: all 4 files have matching status/profile
grep "DPS STATUS:" docs/superskills/DPS_v5/{README,CONTRACTS,BLUEPRINT,ADR}.md 2>/dev/null

# 4. Run DPS linter if available:
python3 docs/superskills/DPS_v5/tools/dps.py lint --strict 2>/dev/null || echo "dps.py not available — skip"
```

Record DPS structural findings in Risk Assessment output:
```
### DPS Arc 1 Checks
Single definition: PASS | VIOLATIONS: [list]
Broken Ref<X>:    PASS | BROKEN: [list]
Version sync:     PASS | DRIFT: [list]
DPS lint:         PASS | FINDINGS: [list]
```

**Gate integration:**
- Any DPS structural VIOLATION → auto-escalate Gate Result to HOLD
- DPS lint findings → treat as L3 (Data) finding in VHEATM scan

### Step 3: L1–L7 Quick Scan

For each triggered layer, produce 1 hypothesis:

```
L1 Logic:         Untested branch in happy path?
L2 Concurrency:   Shared state accessed by multiple flows?
L3 Data:          Schema changes with no migration? Nullable fields without defaults?
L4 Integration:   External API — behavior on timeout/500/rate-limit?
L5 Security:      Auth assumed or designed? Privilege scope defined?
L6 Observability: How will breakage be detected in prod?
L7 Cross-cutting: Rate limits? Idempotency? Regulated data? (flag L7.11 if YES)
```

Skip layers cleanly: `L_: no signal` — do not fabricate hypotheses.

### Step 4: Auditor Defense Inline

Flag in spec:
- Assumptions stated as facts ("will always", "guaranteed", "users never will")
- Decisions deferred ("TBD", "to be decided", "later")
- External dependencies treated as perfectly reliable

Mark each as **ASSUMED** — implementation plan must address these explicitly.

---

## [G.AB] Abductive Hypotheses

Two hypotheses the pre-mortem and L1–L7 would NOT catch:

```
Abductive 1: [failure from interaction between correct components]
Abductive 2: [failure only visible at scale or under adversarial input]
```

---

## Output — Append to Spec Document

```markdown
## Risk Assessment (audit-design)
<!-- audit-design: DO NOT DUPLICATE — update this section, do not append a second one -->
<!-- last-run: YYYY-MM-DD | trigger: NORMAL | ESCALATION -->

**Tier:** [1/2/3] | **Date:** YYYY-MM-DD

### Failure Modes
1. [mode] — [severity] — mitigation in plan: YES/NO
2. [mode] — [severity] — mitigation in plan: YES/NO
3. [mode] — [severity] — mitigation in plan: YES/NO

### Layer Signals
[findings — skip clean layers]

### Assumptions to Verify
[ASSUMED items from Step 4]

### Abductive Hypotheses
[two hypotheses]

### Gate Result
<!-- PASS | PASS WITH FLAGS | HOLD -->
PASS — proceed to writing-plans
PASS WITH FLAGS — proceed; writing-plans MUST include mitigation for HIGH findings
HOLD — spec requires revision (list required changes)
```

**Commit:**
```bash
git add docs/superskills/specs/
git commit -m "docs: risk assessment for <spec-slug> [audit-design]"
```

**After commit — clear trigger flags:**
```bash
# Remove escalation flag to prevent re-trigger loop
# Cross-platform (macOS + Linux):
python3 -c "
content = open('docs/superskills/specs/<spec-file>.md').read()
open('docs/superskills/specs/<spec-file>.md', 'w').write(
    content.replace('SPEC_ESCALATION: true', 'SPEC_ESCALATION: false')
)"
git add docs/superskills/specs/<spec-file>.md
git commit -m "docs: clear escalation flag after audit-design re-run"
```

**Gate routing:**
- HOLD → return to `brainstorming` step 5. Do NOT invoke `writing-plans`.
- PASS / PASS WITH FLAGS → invoke `dps-promote` (DRAFT → PROOF-READY), then `writing-plans`.

---

## Red Flags — Never

- Run without reading spec fully first
- Append a second Risk Assessment section (update existing instead)
- Write vague failure modes ("something could go wrong with the API")
- Mark PASS when HIGH finding has no mitigation plan
- Leave `SPEC_ESCALATION: true` after re-audit (always clear it to prevent loop)

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- New entries must follow shared/gotcha-schema.md -->
<!-- DO NOT pre-populate with speculation — real observations only -->
- date: 2026-05-31
  status: ACTIVE
  source: production-audit
  evidence: T2
  scope: skill
  applies_when: >-
    this skill is active and the same failure mode is plausible
  avoid_when: >-
    newer T1/T2 evidence shows this failure mode no longer applies in the current project
  last_seen: 2026-05-31
  retire_if: >-
    no recurrence after 6 relevant cycles, or contradictory newer T1/T2 evidence narrows or invalidates the pattern
  claim: >-
    AI-based restrictions declared trong prompts/labels là aspirational, không enforced (VHEATM v13.0 self-audit MANDATORY-04: CONTEXT_DENIED mechanism)
  root_cause: >-
    'role labels don't work' cho LLMs — mechanism là label-based nhưng labeling không tạo ra actual enforcement
  do_instead: >-
    Trong audit-design FAST scan: flag mọi security claim phụ thuộc vào AI được 'told' to restrict itself. Đây là T4 evidence claims. Escalate lên specialist-review [E.IJ] để independent verification.
- date: 2026-05-31
  status: ACTIVE
  source: production-audit
  evidence: T2
  scope: skill
  applies_when: >-
    this skill is active and the same failure mode is plausible
  avoid_when: >-
    newer T1/T2 evidence shows this failure mode no longer applies in the current project
  last_seen: 2026-05-31
  retire_if: >-
    no recurrence after 6 relevant cycles, or contradictory newer T1/T2 evidence narrows or invalidates the pattern
  claim: >-
    Startup-time env validation catch deployment gaps không visible trong code review (Aletheia validate-env.sh, Tikai Sentry field_validator)
  root_cause: >-
    missing env vars chỉ manifest ở runtime, không phải test time
  do_instead: >-
    Trong FAST pre-implementation audit: check 'feature này có depend vào env var hoặc external config được validate ở startup không?' Nếu KHÔNG → flag như deployment risk. Recommend adding startup validator.
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
