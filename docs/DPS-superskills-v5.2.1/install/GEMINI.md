# Super Skills

This project uses the Super Skills methodology (Superskills × VHEATM).

## MANDATORY: Before any task

Activate the `using-super-skills` skill at session start.
Check for relevant skills before every action.

## Skill invocation (Gemini CLI)

```bash
gemini extensions install https://github.com/<your-fork>/super-skills
```

Or load manually: reference `using-super-skills` skill content at session start.

**Tool mapping for Gemini:**

| Super Skills term | Gemini equivalent |
|---|---|
| `Task tool` | `activate_skill` or background tool |
| `TodoWrite` | In-context checklist (no native tool) |
| Subagent dispatch | Not natively supported — use `executing-plans` instead |
| Artifacts API | Not available — use local subagent fallback for [E.IJ] |

## Priority

1. Instructions in this file
2. Super Skills methodology
3. Default behavior
