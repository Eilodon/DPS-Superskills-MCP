# Installation Guide

## Quick install

```bash
# 1. Copy skills from this bundle root, preserving the current DPS Super Skills format.
cp -r DPS-superskills/* ~/.claude/skills/     # Claude Code
cp -r DPS-superskills/* ~/.agents/skills/      # Cursor / Codex / OpenCode
cp -r DPS-superskills/* ~/.gemini/skills/      # Gemini CLI

# 2. Copy bootstrap file to project root
cp install/CLAUDE.md your-project/CLAUDE.md      # Claude Code / Codex
cp install/AGENTS.md your-project/AGENTS.md      # Codex App / OpenCode-compatible agents
cp install/GEMINI.md your-project/GEMINI.md      # Gemini CLI

# 3. Run skill-init once inside the project
# (agent will create docs/superskills/ structure)
```

## Per-harness setup

### Claude Code
```bash
cp -r DPS-superskills/* ~/.claude/skills/
cp install/CLAUDE.md <project-root>/CLAUDE.md
# Verify: /skill list should include the skills listed in README.md
```

### Cursor
```bash
cp -r DPS-superskills/* ~/.agents/skills/
cp install/CLAUDE.md <project-root>/.cursorrules
# Note: TodoWrite -> use in-context checklist; Artifacts API -> not available
```

### Codex CLI / Codex App
```bash
cp -r DPS-superskills/* ~/.agents/skills/
cp install/AGENTS.md <project-root>/AGENTS.md
```

### OpenCode
```bash
cp -r DPS-superskills/* ~/.agents/skills/
# Tell OpenCode: "Fetch and follow instructions from .opencode/INSTALL.md"
```

### Gemini CLI
```bash
cp -r DPS-superskills/* ~/.gemini/skills/
cp install/GEMINI.md <project-root>/GEMINI.md
```

### claude.ai (chat / Projects)
- Add `install/CLAUDE.md` content to Project instructions.
- Paste relevant SKILL.md content when working on a specific domain.
- Note: subagent Task tool not available -> `executing-plans` only.

## Platform capability matrix

| Capability | Claude Code | Cursor | Codex | OpenCode | Gemini CLI | claude.ai |
|---|---|---|---|---|---|---|
| Skill auto-discovery | yes | yes | yes | yes | yes | Manual |
| Task tool (subagents) | yes | yes | yes | yes | no | no |
| TodoWrite | yes | no | no | no | no | no |
| Artifacts API ([E.IJ]) | no | no | no | no | no | yes |
| `subagent-driven-development` | yes | yes | yes | yes | no | no |
| `executing-plans` fallback | yes | yes | yes | yes | yes | yes |
| `dispatching-parallel-agents` | yes | yes | yes | yes | no | no |

**When Task tool unavailable:** use `executing-plans` instead of `subagent-driven-development`.
**When Artifacts API unavailable:** [E.IJ] uses local subagent fallback (Method B in `specialist-review`).
**When TodoWrite unavailable:** maintain checklist in-context as markdown `- [ ]` items.

## Verify install

```bash
# Check skills are visible
ls ~/.claude/skills/ | grep -E "using-super-skills|complexity-gate|brainstorming|adr-commit|framework-doctor"

# Check bootstrap file is in project
cat CLAUDE.md | grep "Super Skills"

# Run skill-init (in agent session)
# Agent should: create docs/superskills/ structure + write .skill-init record
```

## Verify framework bundle before distribution

```bash
python3 tools/framework_doctor.py .
python3 tools/run_framework_fixtures.py .
python3 tools/epistemic_health_check.py .
```
