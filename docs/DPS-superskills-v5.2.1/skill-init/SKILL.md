---
name: skill-init
description: Use once when starting a new project with super-skills — creates required directory structure, validates environment, and generates KB scaffolding. Run before any other super-skill.
---

# Skill-Init — Project Bootstrap

**Run this skill exactly once per project, before any other super-skill.**
It creates the infrastructure all other skills depend on.

**Announce:** "I'm using skill-init to set up the super-skills project structure."

```bash
# Environment check (auto-injected):
!echo "git:     $(git --version 2>/dev/null || echo 'NOT FOUND')"
!echo "python3: $(python3 --version 2>/dev/null || echo 'NOT FOUND')"
!echo "gh:      $(gh --version 2>/dev/null | head -1 || echo 'NOT FOUND')"
!echo "shell:   $SHELL"
```


---

## Step 1: Validate Environment

```bash
# Check git
git rev-parse --git-dir 2>/dev/null && echo "GIT: OK" || echo "GIT: MISSING"

# Check we're in a repo root (not a subdirectory)
git rev-parse --show-toplevel

# Check write access
touch docs/.skill-init-test 2>/dev/null && rm docs/.skill-init-test \
  && echo "WRITE: OK" || echo "WRITE: FAILED — check permissions"
```

**If GIT: MISSING** → stop. Super-skills requires git. Initialize with `git init` first.
**If WRITE: FAILED** → stop. Fix permissions before proceeding.

### Harness Capability Check

```bash
# Check if subagent dispatch (Task tool) is available
# This determines whether specialist-review's subagent path works
echo "HARNESS: $(basename $SHELL) / check Task tool manually in your agent UI"
```

Note the following limitations by environment:

| Environment | Task tool (subagents) | [E.IJ] via Artifacts |
|---|---|---|
| Claude Code CLI | ✅ supported | ❌ no artifact runtime — use subagent fallback |
| claude.ai chat | ❌ not available | ✅ Artifacts API works |
| Cursor / Codex | ✅ supported | ❌ no artifact runtime — use subagent fallback |
| OpenCode | ✅ supported | ❌ no artifact runtime — use subagent fallback |

Record which environment this project uses — affects `specialist-review` behavior.

---

## Step 1b: DPS Misplacement Scan — Safe Mode

Before creating new directories, ensure the project doesn't already have a DPS structure hidden in a non-standard path.

Default behavior is DRY-RUN. Do not move or delete any existing DPS directory unless the user explicitly confirms or `APPLY=true` is set.

```bash
# Scan for any file containing "DPS STATUS:" outside the standard directory
MISPLACED_DPS_FILE=$(grep -rl "DPS STATUS:" .   --exclude-dir=.git --exclude-dir=node_modules   --exclude-dir=.worktrees --exclude-dir=.venv   | grep -v "docs/superskills/DPS_v5" | head -n 1)

if [ -n "$MISPLACED_DPS_FILE" ]; then
    MISPLACED_DIR=$(dirname "$MISPLACED_DPS_FILE")
    echo "WARNING: existing DPS detected at non-standard path: $MISPLACED_DIR"
    echo "Target path: docs/superskills/DPS_v5"
    echo "DRY-RUN: would run: mkdir -p docs/superskills && mv '$MISPLACED_DIR' docs/superskills/DPS_v5"

    if [ "${APPLY:-false}" != "true" ]; then
        echo "No files moved. Re-run with APPLY=true only after confirming this is the intended DPS folder."
        exit 0
    fi

    mkdir -p docs/superskills/
    [ -d docs/superskills/DPS_v5 ] && [ -z "$(ls -A docs/superskills/DPS_v5)" ] && rmdir docs/superskills/DPS_v5
    mv "$MISPLACED_DIR" docs/superskills/DPS_v5
fi
```

---

## Step 2: Create Directory Structure

```bash
mkdir -p docs/superskills/specs
mkdir -p docs/superskills/adrs
mkdir -p docs/superskills/plans

echo "Directories created:"
ls docs/superskills/
```

---

## Step 2b: DPS Scaffold (Optional — recommended for non-trivial projects)

```bash
mkdir -p docs/superskills/DPS_v5/.agent docs/superskills/DPS_v5/.dps docs/superskills/DPS_v5/tools

# Create blank DPS canonical files (DRAFT status):
# Copy DPS v5 templates from framework without overwriting existing files (-n)
cp -n ~/.claude/skills/bootstrap-templates/dps-README.template.md    docs/superskills/DPS_v5/README.md
cp -n ~/.claude/skills/bootstrap-templates/dps-CONTRACTS.template.md docs/superskills/DPS_v5/CONTRACTS.md
cp -n ~/.claude/skills/bootstrap-templates/dps-BLUEPRINT.template.md docs/superskills/DPS_v5/BLUEPRINT.md
cp -n ~/.claude/skills/bootstrap-templates/dps-ADR.template.md       docs/superskills/DPS_v5/ADR.md
cp -n ~/.claude/skills/dps-tools/dps.py           docs/superskills/DPS_v5/tools/dps.py

echo "DPS scaffold created. Run dps-init after brainstorming to populate."
```

**Note:** DPS scaffold là optional. Simple scripts/utilities không cần full DPS ceremony.
Indicators cần DPS: multi-component, external integrations, team > 1 người, production SaaS.

---

## Step 3: Generate KB Scaffolding

Create `docs/superskills/pattern-debt.md`:

```bash
cat > docs/superskills/pattern-debt.md << 'EOF'
# Pattern Debt Registry

Schema: see shared/pattern-debt-schema.md
Auto-populated by: pattern-globalize skill
Queried by: kb-query skill

<!-- ENTRIES BELOW — do not delete, update status field instead -->

EOF
```


Create `docs/superskills/CONTEXT.md`:

```bash
cat > docs/superskills/CONTEXT.md << 'CTXEOF'
# CONTEXT.md — Domain Knowledge
<!-- Version: 1 — populate via domain-alignment skill, then keep updated via knowledge-compound -->

## Ubiquitous Language
<!-- Add domain terms where the word means something more specific than common usage -->
<!-- Format: **term**: definition. Source: <!-- from ADR or audit: [reference] --> -->

## Architectural Decisions
<!-- Decisions with applicability beyond a single feature -->
<!-- Seeded from bootstrap? See: bootstrap-templates/CONTEXT.md for cross-domain patterns -->

## Domain Gotchas
<!-- Operational surprises that don't fit architectural decisions -->
<!-- New entries: use shared/gotcha-schema.md -->

## Synonyms / Alias Map
<!-- Used by kb-query for alias-assisted search -->
auth: authentication, token, session, credential, permission
worker: async job, queue, background task, temporal
release: deploy, rollout, enable traffic, cutover
migration: schema change, backfill, data move
CTXEOF
```


Create `docs/superskills/CONSTITUTION.md`:

```bash
cat > docs/superskills/CONSTITUTION.md << 'EOF'
# Project Constitution
# NON-NEGOTIABLE — agent không được override những rules này.
# audit-design FAST scan đọc file này trước khi bắt đầu.

## DPS Profile
<!-- DPS-Lite | DPS-Standard | DPS-Critical -->
Profile: {{PROFILE}}
DPS Location: docs/superskills/DPS_v5/
DPS Tooling: docs/superskills/DPS_v5/tools/dps.py

## Architecture Laws
# Format: - [LAW]: [rationale]
# Example: - No raw SQL: use ORM only — prevents injection class
# Example: - All external calls must have timeout + fallback — prevents tikai-H25 class

## Security Mandates
# Format: - [MANDATE]: [what triggers a violation]
# Example: - API keys via headers only, never URL params — Aletheia R01 class

## Quality Gates
# Format: - [GATE]: [measurable condition that must be true]
# Example: - No merge without passing integration tests for affected modules

## Defer Until Explicitly Enabled
# Things the team has decided NOT to do yet
# Example: - No caching layer until p95 latency > 500ms measured
EOF
```

Create `docs/superskills/compound-wiki.md`:

```bash
cat > docs/superskills/compound-wiki.md << 'EOF'
# Compound Wiki

Auto-populated by: knowledge-compound skill (run after every adr-commit)
Queried by: kb-query skill
MCP-ready: YAML frontmatter per entry for future semantic KB import

<!-- ENTRIES BELOW — do not delete; each entry is a cycle's extracted learnings -->

EOF
```

Create `docs/superskills/qbr-calibration.md`:

```bash
cat > docs/superskills/qbr-calibration.md << 'EOF'
# QBR Accuracy Calibration Log

Auto-populated by: task-risk-score skill (M.AT tracker)
Format: task_id | sprint | predicted_qbr | predicted_risk | actual_severity | outcome

| task_id | sprint | predicted_qbr | predicted_risk | actual_severity | outcome |
|---------|--------|--------------|----------------|-----------------|---------|
<!-- Add entries after each sprint retrospective -->

## Calibration Summary
- Total entries: 0
- Cycles completed: 0
- Threshold status: PRE-CALIBRATION (need 5+ sprints for empirical calibration)
- Current HIGH threshold: QBR ≥ 6 (heuristic baseline)
EOF
```

Create `docs/superskills/kb-index.md`:

```bash
cat > docs/superskills/kb-index.md << 'EOF'
# Super-Skills KB Index

## ADRs
<!-- Auto-listed by kb-query — run: "search KB for [topic]" -->

## Pattern Debts
See: docs/superskills/pattern-debt.md

## Specs
<!-- docs/superskills/specs/ -->

## Plans
<!-- docs/superskills/plans/ -->
EOF
```

---

## Step 4: Write Init Record

```bash
cat > docs/superskills/.skill-init << EOF
INIT_DATE: $(date +%Y-%m-%d)
INIT_VERSION: super-skills-v5
GIT_ROOT: $(git rev-parse --show-toplevel)
HARNESS: [fill in: claude-code | claude-chat | cursor | codex | opencode]
TASK_TOOL: [fill in: YES | NO]
ARTIFACTS_API: [fill in: YES | NO]
STATUS: READY
EOF

echo "Init record written."
```

**Fill in HARNESS, TASK_TOOL, and ARTIFACTS_API** based on your environment.

---

## Step 5: Commit

```bash
git add docs/superskills/
git commit -m "chore: initialize super-skills project structure"
```

---

## Step 6: Confirm

Output exactly this when done:

```
✅ SKILL-INIT COMPLETE

Directories:  docs/superskills/{specs,adrs,plans}
KB files:     pattern-debt.md, qbr-calibration.md, kb-index.md
Init record:  docs/superskills/.skill-init

Next step: run brainstorming → audit-design → writing-plans pipeline.
```

---

## Red Flags — Never

- Run any other super-skill before skill-init on a new project
- Skip the harness capability check — it affects specialist-review behavior
- Create directories without committing to git
- Run more than once per project (idempotent: check `.skill-init` exists first)

**Idempotency check:**
```bash
[ -f docs/superskills/.skill-init ] && echo "Already initialized — skip" && exit 0
```

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->
<!-- DO NOT pre-populate with speculation — real observations only -->
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
