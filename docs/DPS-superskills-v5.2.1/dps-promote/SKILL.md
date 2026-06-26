---
name: dps-promote
description: Use to advance DPS lifecycle status — from DRAFT to PROOF-READY, PROOF-READY to APPROVED-SSOT, or IMPLEMENTATION-ACTIVE to LIVING-SPEC. Runs promotion checklist before advancing.
---

# DPS-Promote — Lifecycle Gate Management

**Register: TECHNIQUE**
**Goal:** Advance DPS status with evidence-backed checklist.
**Constraints:** Each promotion has a gate — cannot skip. DRAFT can never be implementation authority.

---

## Pre-Check

```bash
# Current status:
grep "DPS STATUS" .dps/spec/README.md .dps/spec/BLUEPRINT.md 2>/dev/null | head -4
```

---

## Promotion Paths

### DRAFT → PROOF-READY

Run only if `audit-design` returned PASS or PASS WITH FLAGS.

Gate checklist:
```
[ ] SYSTEM INTENT block filled (no {{placeholders}})
[ ] CONTRACTS.md has all schemas defined (no {{FILL-IN}})
[ ] All Ref<X> in BLUEPRINT.md resolve to CONTRACTS.md
[ ] SUCCESS CRITERIA filled (≤ 3 measurable signals)
[ ] Build order in Section 8 has no circular dependency
[ ] audit-design gate result = PASS or PASS WITH FLAGS (not HOLD)
[ ] Proof Handoff Snapshot filled in BLUEPRINT.md
```

Action:
```bash
# Update status in all 4 canonical files:
python3 .dps/tools/dps.py sync  # generates sidecars
python3 .dps/tools/dps.py check # verifies consistency
git add .dps/
git commit -m "dps: promote DRAFT → PROOF-READY [dps-promote]"
```

### PROOF-READY → APPROVED-SSOT

Run after user/reviewer sign-off on the Proof Handoff review.

Gate checklist (Proof Handoff Interface — all blocking targets must be PASS):
```
[ ] Intent coherence — SYSTEM INTENT review/PRD check complete                (BLOCKING)
[ ] Contract consistency — no broken Ref<X>, no schema defined twice          (BLOCKING)
[ ] Component traceability — every component has ADR Origin                   (BLOCKING)
[ ] Behavior determinism — agent can implement without follow-up questions     (BLOCKING)
[ ] Invariant ownership — every invariant has an ENFORCE BY component         (BLOCKING)
[ ] Build feasibility — Section 8 phase order has no circular dependency      (BLOCKING)
[ ] Arc 2 readiness — Learning Loop + metrics/alerts refs exist               (BLOCKING if project > prototype)
[ ] Dependency fitness — architecture-relevant deps reviewed                  (TÙY RISK)
[ ] Proof Handoff Snapshot in BLUEPRINT.md — all blocking rows = PASS
[ ] PROMOTION BASIS filled in README.md (links/notes/audit refs/evidence)
[ ] Promotion Record block written:
      PROMOTED FROM : PROOF-READY
      PROMOTED TO   : APPROVED-SSOT
      DATE          : {{YYYY-MM-DD}}
      PROMOTED BY   : {{WHO}}
      EVIDENCE      : {{links / notes / audit refs}}
      ACCEPTED RISK : {{known unresolved non-blockers, or "none"}}
[ ] dps.py check passes with no violations
```

Action:
```bash
# 1. Edit promotion record in README.md, then update status in all 4 canonical files
# 2. Regenerate sidecars and verify:
python3 .dps/tools/dps.py sync
python3 .dps/tools/dps.py check
git add .dps/
git commit -m "dps: promote PROOF-READY → APPROVED-SSOT [dps-promote]"
```

### APPROVED-SSOT → IMPLEMENTATION-ACTIVE

Trigger: `adr-commit` runs on the first implementation commit for this DPS.

Gate: implementation has started (first real code commit against this spec).

Action:
```bash
# Update DPS STATUS in all 4 canonical files: APPROVED-SSOT → IMPLEMENTATION-ACTIVE
# Then regenerate sidecars:
python3 .dps/tools/dps.py sync
python3 .dps/tools/dps.py check
git add .dps/
git commit -m "dps: promote APPROVED-SSOT → IMPLEMENTATION-ACTIVE [adr-commit]"
```

### IMPLEMENTATION-ACTIVE → LIVING-SPEC

Trigger: `audit-distill` with first production cycle findings.

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
