# dps-init — nano

**Register: TECHNIQUE**
**Trigger:** After brainstorming SPEC_APPROVED=true, for non-trivial projects (multi-component, external integrations, team > 1, production SaaS).

**Non-negotiable:**
- SPEC_APPROVED must be true before running.
- Do not run if `docs/superskills/DPS_v5/` already exists — run `dps-promote` instead.
- Creates CONTRACTS.md, BLUEPRINT.md, ADR.md from approved spec content.
- Generates sidecars: `dps.py sync && dps.py check` before commit.

**Output:** `docs/superskills/DPS_v5/` initialized, DPS STATUS = DRAFT, sidecars generated, committed.

**Next:** `audit-design` (DPS-aware Arc 1 checks activate automatically when DPS present).

→ Full: `dps-init/SKILL.md`
