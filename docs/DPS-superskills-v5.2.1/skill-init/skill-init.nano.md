# skill-init — nano

**Trigger:** Once per project, before any other Super Skill.

**Non-negotiable:**
- Creates `docs/superskills/{specs,adrs,plans}/` + KB files (pattern-debt, qbr-calibration, CONTEXT, CONSTITUTION, compound-wiki).
- Step 1b: DPS Misplacement Scan — auto-migrates existing DPS to standard path.
- Step 2b: Optional DPS scaffold at `docs/superskills/DPS_v5/` (recommended for non-trivial projects).
- Records harness capabilities in `.skill-init` (TASK_TOOL, ARTIFACTS_API, HARNESS).
- Idempotent: `[ -f docs/superskills/.skill-init ] && echo "Already initialized" && exit 0`

**Output:** `docs/superskills/.skill-init` with `STATUS: READY`.

→ Full: `skill-init/SKILL.md`