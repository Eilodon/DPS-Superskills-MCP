# dps-promote — nano

**Register: TECHNIQUE**
**Trigger:**
- After `audit-design` PASS/PASS WITH FLAGS → DRAFT → PROOF-READY
- After user/reviewer sign-off on Proof Handoff → PROOF-READY → APPROVED-SSOT
- Called by `adr-commit` on first implementation commit → APPROVED-SSOT → IMPLEMENTATION-ACTIVE
- After `audit-distill` with first production cycle findings → IMPLEMENTATION-ACTIVE → LIVING-SPEC

**Non-negotiable:**
- Cannot skip or merge promotion steps — each has a gate checklist.
- DRAFT is never implementation authority — must reach APPROVED-SSOT before coding agent uses as source.
- Run `dps.py sync && dps.py check` and commit before every promotion.
- PROOF-READY → APPROVED-SSOT requires all Proof Handoff blocking targets = PASS.

**Output:** DPS STATUS advanced one level in all 4 canonical files, sidecars regenerated, committed.

→ Full: `dps-promote/SKILL.md`
