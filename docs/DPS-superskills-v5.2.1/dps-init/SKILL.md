---
name: dps-init
description: Use after brainstorming SPEC_APPROVED=true to elevate spec into DPS structure. Creates CONTRACTS.md, BLUEPRINT.md, ADR.md canonical files from approved spec. Also usable standalone to initialize DPS for a new project.
---

# DPS-Init — Elevate Spec to DPS Structure

**Register: TECHNIQUE**
**Goal:** Convert approved brainstorming spec into DPS canonical files.
**Constraints:** SPEC_APPROVED must be true. Do not run if DPS already initialized.
**Adapt:** extraction depth to spec quality — sparse spec needs more scaffolding prompts.

**Announce:** "Using dps-init to promote spec to DPS structure."

---

## Pre-Check

```bash
# Confirm spec approved:
grep "SPEC_APPROVED: true" .dps/lifecycle/drafts/*.md 2>/dev/null | tail -1

# DPS already initialized?
ls .dps/ 2>/dev/null && echo "⚠️  DPS already initialized — run dps-promote instead"

# dps.py available? (or use the dps_init / dps_check MCP tools instead)
ls .dps/tools/dps.py 2>/dev/null || echo "⚠️  Missing dps.py — copy from framework or use dps_check tool"
```

---

## Step 1: Create DPS Directory

```bash
mkdir -p .dps/spec .dps/agent .dps/tools
# Copy dps.py from skills framework:
cp ~/.claude/skills/dps-tools/dps.py .dps/tools/dps.py
```

## Step 2: Scaffold SYSTEM INTENT Block

Read approved spec. Extract/map:
- PROBLEM: from spec "Goal" or "Problem" section
- FOR: from spec "Users" or "Stakeholders" section
- ASSUMING: from spec assumptions — if none explicit, surface 2-3 key assumptions
- WILL_DRIFT_IF: ask user if not in spec ("When would these assumptions become wrong?")
- NON-GOALS: from spec "Out of scope" or infer from scope boundaries
- ANTI-REQUIREMENTS: surface from spec; ask if none explicit

## Step 3: Scaffold CONTRACTS.md

Read spec. Find any:
- Data model definitions / schemas
- API request/response shapes
- Enum/type definitions
- Error codes

Map each into CONTRACTS.md Section 3 schema block with `<!-- dps:id=schema.X -->` marker.
Note: use `Ref<X>` in BLUEPRINT for any schema defined here — never duplicate.

## Step 4: Scaffold BLUEPRINT.md

Map from spec:
- Architecture → SYSTEM OVERVIEW ASCII diagram
- Components → Component Registry table (Section 2)
- Data flow → Data Flow section (Section 3)
- State machine → Section 4 (if stateful components exist)
- Phase plan → Section 8 (Build Order) — from writing-plans if already done
- Success criteria → SUCCESS CRITERIA block (Section 1)

## Step 5: Scaffold ADR.md

Create initial ADR-001 for the primary architecture decision (the one that determines the whole approach).
Use DPS ADR format — see `adr-commit/SKILL.md` Step 3.5 (DPS ADR format block) for the full template with CONFIDENCE, VOLATILITY, IMPACT RADIUS, and CHANGE CLASSIFICATION fields.

## Step 6: Generate Sidecars

```bash
cd .dps/
python3 tools/dps.py sync
python3 tools/dps.py check
```

## Step 7: Set Status

In all 4 canonical files, set:
```
DPS STATUS: DRAFT
```

## Step 8: Commit

```bash
git add .dps/
git commit -m "dps: initialize DPS structure from <spec-slug> [dps-init]"
```

**Next step:** `audit-design` (reads DPS BLUEPRINT.md if DPS present)

---

## Gotchas — Observed Failure Points
<!-- Populated by knowledge-compound after cycles where this skill underperformed -->

## DPS Tooling Fallback — Manual Check

If `python3` or `dps.py` is unavailable, DPS is degraded but not disabled. Label enforcement as manual fallback and complete this checklist before promotion or completion:

```text
[ ] Every Ref<X> in BLUEPRINT resolves to CONTRACTS.
[ ] BLUEPRINT does not redefine schemas owned by CONTRACTS.
[ ] ADR fields complete.
[ ] LOW confidence has VALIDATION TARGET.
[ ] WATCHFUL/VOLATILE has WATCH SIGNAL.
[ ] LAST CONFIRMED freshness reviewed.
[ ] DPS STATUS consistent across README/CONTRACTS/BLUEPRINT/ADR.
[ ] No unresolved SPEC BUG before implementation.
```

Output `DPS enforcement: automated` when `dps.py check` ran, otherwise `DPS enforcement: manual fallback`.
