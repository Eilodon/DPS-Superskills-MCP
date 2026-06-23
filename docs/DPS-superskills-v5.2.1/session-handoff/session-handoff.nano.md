# session-handoff — nano

**Trigger:** Session sắp kết thúc và task chưa hoàn thành, hoặc cần chuyển sang session/agent mới.

**Non-negotiable:**
- Handoff doc phải machine-readable — next agent load nó, không chỉ humans đọc.
- Include: completed steps + open decisions + evidence anchors produced + next action cụ thể.
- Commit trước khi session kết thúc. Uncommitted = lost.

**Output:** `docs/superskills/session-state-YYYY-MM-DD-HH.md` committed.

→ Full: `session-handoff/SKILL.md`
