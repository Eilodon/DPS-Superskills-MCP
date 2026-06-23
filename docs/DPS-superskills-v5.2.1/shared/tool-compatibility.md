# Tool Compatibility Matrix

Quick reference for per-harness capabilities affecting Super Skills behavior.
Full install guide: `install/README-install.md`

## Capability Matrix

| Capability | Claude Code | Cursor | Codex | OpenCode | Gemini | claude.ai |
|---|---|---|---|---|---|---|
| Skill auto-discovery | ✅ | ✅ | ✅ | ✅ | ✅ | Manual |
| Task tool (subagents) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| TodoWrite | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Artifacts API ([E.IJ]) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `git`, `grep`, `python3` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `gh` (GitHub CLI) | If installed | If installed | If installed | If installed | If installed | ❌ |
| CLAUDE.md auto-load | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| AGENTS.md auto-load | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| GEMINI.md auto-load | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

## Fallback Rules

| Missing capability | Affected skill | Fallback |
|---|---|---|
| Task tool | `subagent-driven-development` | Use `executing-plans` |
| Task tool | `dispatching-parallel-agents` | Sequential sessions per domain |
| TodoWrite | `subagent-driven-development`, `executing-plans` | Inline `- [ ]` markdown checklist |
| Artifacts API | `specialist-review` [E.IJ] Method A | Method B (local subagent with stripped context) |
| `gh` CLI | `adr-commit` Option 2 (PR) | Manual PR creation, paste PR body |
| `git` | Multiple skills | Confirm git is installed: `git --version` |
| `python3` | `specialist-review`, `audit-design` sed fix | Use platform's sed: `sed -i '' '...'` (macOS) or `sed -i '...'` (Linux) |

## OS-specific notes

**macOS:** `python3` sed replacement commands preferred over `sed -i` (different behavior).
**Windows:** Most shell commands won't work natively. Use WSL2 or Git Bash.
**Linux:** All commands work as documented.

## `gh` CLI availability check

```bash
gh --version 2>/dev/null && echo "gh: available" || echo "gh: not installed — manual PR needed"
```
