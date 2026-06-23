# adr-commit — nano

**Trigger:** Before merging or closing any branch.

**Non-negotiable:**
- ADR required: Owner field + measurable Next Cycle Trigger. Reject: "TBD", "post-launch".
- G.CDOC: re-read ADR Section 3+7 claims against actual code. CONTRADICTED → fix first.
- PATTERN-DEBT lifecycle check: fired triggers must be actioned before merge.
- DPS present → append to `DPS_v5/ADR.md` (DPS format with CONFIDENCE/VOLATILITY/IMPACT RADIUS) + run `dps.py sync`.
- DPS absent → standalone `docs/superskills/adrs/YYYY-MM-DD-<slug>.md`.

**Output:** ADR committed (DPS or legacy mode) + merge decision.

→ Full: `adr-commit/SKILL.md`