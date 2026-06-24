# DPS-Superskills MCP Server — Hướng dẫn kết nối

## Tổng quan

Server expose 5 MCP tools:
- `skill_list` — liệt kê tất cả 31 skills theo register
- `skill_read` — đọc đầy đủ SKILL.md của một skill
- `skill_run` — invoke skill với context của bạn → trả về checklist + output template + gotchas
- `super_mcp_ping` — kiểm tra server hoạt động
- `super_mcp_pattern_debt` — xem pattern debt registry

---

## 1. Build

```bash
cd /home/ybao/B.1/DPS-Superskills
pnpm install
pnpm build
```

---

## 2. Kết nối Claude Desktop (stdio mode)

Mở file: `~/.config/claude/claude_desktop_config.json` (Linux) hoặc
`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "dps-superskills": {
      "command": "node",
      "args": ["/home/ybao/B.1/DPS-Superskills/dist/index.js"],
      "env": {
        "TRANSPORT_DRIVER": "stdio",
        "STORAGE_DRIVER": "fs",
        "MCP_PLUGIN_ALLOWLIST": "system.tool.ts,system.tool.js,skills.tool.ts,skills.tool.js,knowledge.tool.ts,knowledge.tool.js",
        "MCP_PLUGIN_ISOLATION_MODE": "policy",
        "MCP_PROJECT_ID": "dps-superskills",
        "MCP_TENANT_ID": "tenant_local",
        "MCP_SAFE_MODE": "true"
      }
    }
  }
}
```

Restart Claude Desktop → Tools panel sẽ hiển thị `skill_list`, `skill_read`, `skill_run`.

---

## 3. Kết nối Cursor (stdio mode)

Mở Cursor Settings → MCP → Add server:

```json
{
  "name": "dps-superskills",
  "command": "node /home/ybao/B.1/DPS-Superskills/dist/index.js",
  "env": {
    "TRANSPORT_DRIVER": "stdio",
    "MCP_PLUGIN_ALLOWLIST": "system.tool.ts,system.tool.js,skills.tool.ts,skills.tool.js,knowledge.tool.ts,knowledge.tool.js",
    "MCP_PLUGIN_ISOLATION_MODE": "policy",
    "MCP_PROJECT_ID": "dps-superskills",
    "MCP_TENANT_ID": "tenant_local"
  }
}
```

---

## 4. Kết nối Antigravity / Claude Code (stdio mode)

Trong `.claude/CLAUDE.md` của dự án, hoặc cấu hình MCP của IDE:

```json
{
  "mcpServers": {
    "dps-superskills": {
      "command": "node",
      "args": ["/home/ybao/B.1/DPS-Superskills/dist/index.js"],
      "env": {
        "TRANSPORT_DRIVER": "stdio",
        "MCP_PLUGIN_ALLOWLIST": "system.tool.ts,system.tool.js,skills.tool.ts,skills.tool.js,knowledge.tool.ts,knowledge.tool.js",
        "MCP_PLUGIN_ISOLATION_MODE": "policy",
        "MCP_PROJECT_ID": "dps-superskills",
        "MCP_TENANT_ID": "tenant_local"
      }
    }
  }
}
```

---

## 5. HTTP mode (cho remote / multi-client)

Tạo `.env` với:

```env
TRANSPORT_DRIVER=http
HTTP_HOST=127.0.0.1
HTTP_PORT=3333
STORAGE_DRIVER=fs
MCP_AUTH_MODE=api_key
MCP_API_KEY=<tạo string random ≥32 ký tự>
ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_HOSTS=localhost,127.0.0.1
MCP_PLUGIN_ALLOWLIST=system.tool.ts,system.tool.js,skills.tool.ts,skills.tool.js,knowledge.tool.ts,knowledge.tool.js
MCP_PLUGIN_ISOLATION_MODE=policy
MCP_PROJECT_ID=dps-superskills
MCP_TENANT_ID=tenant_local
```

Chạy:
```bash
node dist/index.js
# → Server listening on HTTP 127.0.0.1:3333 at /mcp
```

Kết nối từ client với header:
```
Authorization: Bearer <MCP_API_KEY>
Content-Type: application/json
```

---

## 6. Dev mode (pnpm dev, không cần build)

```bash
pnpm dev
```

Dùng `tsx watch` — server tự restart khi code thay đổi.

---

## 7. Ví dụ sử dụng

```
# Trong Claude/Cursor, gọi:
skill_run(skill_name="complexity-gate", task_description="Thêm auth vào API endpoint")
→ Nhận: COMPLEXITY GATE scores + tier + required skills

skill_run(skill_name="brainstorming", task_description="Design user notification system", context="Next.js, PostgreSQL, team 3 người")
→ Nhận: Checklist 9 bước + gotchas + output template

skill_run(skill_name="systematic-debugging", error_message="TypeError: Cannot read properties of undefined (reading 'userId')", context="src/auth/middleware.ts:42")
→ Nhận: 4-phase debugging workflow với Evidence Anchor format

skill_list(register="DISCIPLINE")
→ Nhận: 6 iron-law skills cần chạy bắt buộc
```

---

## 8. Skills có sẵn (31 skills)

**DISCIPLINE:** complexity-gate, tdd-verified, verification-before-completion, context-reanchor, epistemic-health-check, privacy-secrets-gate

**TECHNIQUE:** brainstorming, dps-init, audit-design, dps-promote, writing-plans, task-risk-score, systematic-debugging, pattern-globalize, specialist-review, release-readiness, subagent-driven-development, executing-plans, dispatching-parallel-agents, receiving-code-review, using-git-worktrees, session-handoff

**KNOWLEDGE LAYER:** domain-alignment, knowledge-compound, audit-distill, adr-commit

**REFERENCE:** kb-query, skill-init, writing-super-skills, framework-doctor
