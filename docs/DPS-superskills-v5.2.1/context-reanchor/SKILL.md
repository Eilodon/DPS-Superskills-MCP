---
name: context-reanchor
description: Use in long sessions, after loading many files, after repeated failed attempts, before phase transitions, or before completion claims — refreshes active goals, skill obligations, evidence anchors, and unresolved T4 assumptions to prevent intra-session instruction drift.
---

# Context-Reanchor — Prevent Intra-Session Drift

**Register: DISCIPLINE**
**Goal:** Restore instruction precision before the session drifts away from loaded skills and constraints.
**Core principle:** agents do not only forget between sessions; they drift within long sessions.

**Announce:** "Using context-reanchor to refresh active obligations before continuing."

---

## Trigger

Run when any of these are true:
- conversation turn > 20;
- multiple large files were loaded;
- before phase transition: design -> implementation -> review -> completion;
- after 2+ failed attempts;
- before a completion claim in a long session;
- active skill was loaded many turns ago;
- evidence anchors are scattered or unclear.

Budget mode reduces verbosity. Context-reanchor restores obligation precision. They are related but not the same.

---

## Reanchor Record

Keep it compact:

```text
RE-ANCHOR
Goal:
Active skill obligations:
Non-negotiable constraints:
Evidence anchors:
Still T4 / ASSUMED:
Next gate:
Need to re-read nano/full skill: yes/no
```

If any critical obligation is uncertain, re-read the relevant nano/full skill before proceeding.

---

## Stop Conditions

Stop and resolve before continuing if:
- the next step depends on T4 evidence;
- the active goal changed without an ADR/spec update;
- repeated failure suggests `systematic-debugging` or DPS Spec-Conflict Signal;
- completion would be claimed without `verification-before-completion`.

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- New entries should follow shared/gotcha-schema.md -->
