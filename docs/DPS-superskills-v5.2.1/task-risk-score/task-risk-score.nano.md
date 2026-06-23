# task-risk-score — nano

**Trigger:** During writing-plans Self-Review. Skip only: UI strings, CSS, renames, comments.

**Non-negotiable:**
- Step 0: declare CONTEXT_TYPE (EXTERNAL_SERVICE | BUSINESS_LOGIC | INFRASTRUCTURE | UI)
- EXTERNAL_SERVICE → D = min(scored_D, 1). External failures only visible in prod.
- `QBR = (Severity × Blast-Radius) / Detectability`. HIGH ≥ 6 → decompose.
- CROSS boundary → `fix-path-owner` required.
- Log to `docs/superskills/qbr-calibration.md` after retrospective.

**Output:** Task Risk Summary table appended to plan.

→ Full: `task-risk-score/SKILL.md`