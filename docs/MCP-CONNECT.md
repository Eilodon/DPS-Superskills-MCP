# DPS-Superskills MCP Server — Kết nối IDE & Chatbot

## Tổng quan

Server expose **10 MCP tools** và **31 MCP Resources** (`skill://name`):

### MCP Tools

| Tool | Plugin | Mô tả |
|------|--------|-------|
| `skill_list` | skills | Liệt kê tất cả 31 skills theo register |
| `skill_read` | skills | Đọc đầy đủ SKILL.md của một skill |
| `skill_run` | skills | Invoke skill với context → checklist + gotchas + output template |
| `skill_dispatch` | skills | Generate prompt template cho subagent (C0–C4, role: implementer/reviewer/specialist) |
| `skill_search` | skills | Tìm skill theo keyword (tên, mô tả, register) |
| `kb_write` | knowledge | Ghi gotcha/decision/bug-pattern vào KB (persist cross-session) |
| `kb_update` | knowledge | Cập nhật entry KB đã có theo slug |
| `kb_query` | knowledge | Tìm kiếm trong KB |
| `kb_health` | knowledge | Kiểm tra KB health: stale entries, coverage gaps |
| `super_mcp_ping` | system | Health check server |

### MCP Resources (auto-inject)

31 skills được expose qua URI `skill://<name>` (e.g. `skill://complexity-gate`).
Client hỗ trợ Resources (Claude Desktop, Cursor) có thể tự inject DISCIPLINE skills
vào system context — LLM nhận framework rules mà không cần gọi tool.

---

## 1. Build (bắt buộc lần đầu)

```bash
cd /home/ybao/B.1/DPS-Superskills
pnpm install
pnpm build
```

Hoặc dùng script tự động:
```bash
./install.sh
```
Script sẽ build và in sẵn cấu hình JSON cho từng IDE với đường dẫn tuyệt đối.

---

## 2. Claude Desktop

**Config file:**
- Linux: `~/.config/claude/claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dps-superskills": {
      "command": "node",
      "args": ["/home/ybao/B.1/DPS-Superskills/dist/index.js"],
      "env": {
        "TRANSPORT_DRIVER": "stdio",
        "STORAGE_DRIVER": "fs",
        "MCP_SAFE_MODE": "false",
        "MCP_PLUGIN_ALLOWLIST": "system.tool.js,skills.tool.js,knowledge.tool.js,code_index.tool.js,dps.tool.js",
        "MCP_PLUGIN_ISOLATION_MODE": "policy",
        "MCP_ENABLE_SKILL_RESOURCES": "true",
        "MCP_PROJECT_ID": "dps-superskills",
        "MCP_TENANT_ID": "tenant_local"
      }
    }
  }
}
```

Restart Claude Desktop → Tools panel hiển thị tất cả 10 tools.

> **Lưu ý `MCP_SAFE_MODE=false`**: Cần thiết để `kb_write` và `kb_update` hoạt động.
> Với stdio local, đây là an toàn (không có third-party plugins, không exposed network).

---

## 3. Claude Code (CLI)

Thêm vào `.claude/settings.json` trong project, hoặc `~/.claude/settings.json` (global):

```json
{
  "mcpServers": {
    "dps-superskills": {
      "command": "node",
      "args": ["/home/ybao/B.1/DPS-Superskills/dist/index.js"],
      "env": {
        "TRANSPORT_DRIVER": "stdio",
        "STORAGE_DRIVER": "fs",
        "MCP_SAFE_MODE": "false",
        "MCP_PLUGIN_ALLOWLIST": "system.tool.js,skills.tool.js,knowledge.tool.js,code_index.tool.js,dps.tool.js",
        "MCP_PLUGIN_ISOLATION_MODE": "policy",
        "MCP_ENABLE_SKILL_RESOURCES": "true",
        "MCP_PROJECT_ID": "dps-superskills",
        "MCP_TENANT_ID": "tenant_local"
      }
    }
  }
}
```

Sau đó trong Claude Code: `/mcp` để kiểm tra connection.

---

## 4. Cursor

**Settings → MCP → Add Server → Manual JSON:**

```json
{
  "dps-superskills": {
    "command": "node",
    "args": ["/home/ybao/B.1/DPS-Superskills/dist/index.js"],
    "env": {
      "TRANSPORT_DRIVER": "stdio",
      "STORAGE_DRIVER": "fs",
      "MCP_SAFE_MODE": "false",
      "MCP_PLUGIN_ALLOWLIST": "system.tool.js,skills.tool.js,knowledge.tool.js,code_index.tool.js,dps.tool.js",
      "MCP_PLUGIN_ISOLATION_MODE": "policy",
      "MCP_ENABLE_SKILL_RESOURCES": "true",
      "MCP_PROJECT_ID": "dps-superskills",
      "MCP_TENANT_ID": "tenant_local"
    }
  }
}
```

Hoặc thêm vào `~/.cursor/mcp.json` (global) / `.cursor/mcp.json` (per-project).

---

## 5. VS Code (MCP Extension)

Thêm vào `.vscode/mcp.json` hoặc User Settings (`settings.json`):

```json
{
  "mcp": {
    "servers": {
      "dps-superskills": {
        "command": "node",
        "args": ["/home/ybao/B.1/DPS-Superskills/dist/index.js"],
        "env": {
          "TRANSPORT_DRIVER": "stdio",
          "STORAGE_DRIVER": "fs",
          "MCP_SAFE_MODE": "false",
          "MCP_PLUGIN_ALLOWLIST": "system.tool.js,skills.tool.js,knowledge.tool.js,code_index.tool.js,dps.tool.js",
          "MCP_PLUGIN_ISOLATION_MODE": "policy",
          "MCP_ENABLE_SKILL_RESOURCES": "true",
          "MCP_PROJECT_ID": "dps-superskills",
          "MCP_TENANT_ID": "tenant_local"
        }
      }
    }
  }
}
```

---

## 6. Windsurf

Thêm vào `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "dps-superskills": {
      "command": "node",
      "args": ["/home/ybao/B.1/DPS-Superskills/dist/index.js"],
      "env": {
        "TRANSPORT_DRIVER": "stdio",
        "STORAGE_DRIVER": "fs",
        "MCP_SAFE_MODE": "false",
        "MCP_PLUGIN_ALLOWLIST": "system.tool.js,skills.tool.js,knowledge.tool.js,code_index.tool.js,dps.tool.js",
        "MCP_PLUGIN_ISOLATION_MODE": "policy",
        "MCP_ENABLE_SKILL_RESOURCES": "true",
        "MCP_PROJECT_ID": "dps-superskills",
        "MCP_TENANT_ID": "tenant_local"
      }
    }
  }
}
```

---

## 7. AntiGravity / Codex CLI / OpenCode

Dùng config format `mcpServers` chuẩn. Ví dụ cho AntiGravity (`~/.antigravity/config.json`):

```json
{
  "mcpServers": {
    "dps-superskills": {
      "command": "node",
      "args": ["/home/ybao/B.1/DPS-Superskills/dist/index.js"],
      "env": {
        "TRANSPORT_DRIVER": "stdio",
        "STORAGE_DRIVER": "fs",
        "MCP_SAFE_MODE": "false",
        "MCP_PLUGIN_ALLOWLIST": "system.tool.js,skills.tool.js,knowledge.tool.js,code_index.tool.js,dps.tool.js",
        "MCP_PLUGIN_ISOLATION_MODE": "policy",
        "MCP_ENABLE_SKILL_RESOURCES": "true",
        "MCP_PROJECT_ID": "dps-superskills",
        "MCP_TENANT_ID": "tenant_local"
      }
    }
  }
}
```

---

## 8. HTTP Mode (remote / multi-client / Docker)

Tạo `.env` trong project root:

```env
TRANSPORT_DRIVER=http
HTTP_HOST=127.0.0.1
HTTP_PORT=3333
STORAGE_DRIVER=fs
MCP_AUTH_MODE=api_key
MCP_API_KEY=<random string ≥ 32 chars>
ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_HOSTS=localhost,127.0.0.1
MCP_PLUGIN_ALLOWLIST=system.tool.js,skills.tool.js,knowledge.tool.js,code_index.tool.js,dps.tool.js
MCP_PLUGIN_ISOLATION_MODE=policy
MCP_SAFE_MODE=false
MCP_ENABLE_SKILL_RESOURCES=true
MCP_PROJECT_ID=dps-superskills
MCP_TENANT_ID=tenant_local
ENABLE_RATE_LIMIT=true
ENABLE_QUOTA=true
```

Chạy:
```bash
node dist/index.js
# → [SUPER-MCP] Server listening on HTTP 127.0.0.1:3333 at /mcp
```

Client kết nối với header:
```
x-api-key: <MCP_API_KEY>
Content-Type: application/json
```

> **Quan trọng**: với `MCP_AUTH_MODE=api_key`, server đọc header `x-api-key`,
> KHÔNG phải `Authorization: Bearer`. Xem `src/security/auth.ts:76`.
> `Authorization: Bearer` chỉ áp dụng cho `MCP_AUTH_MODE=jwt` / `oidc_jwks`.

Docker Compose (production với Redis + JWT):
```bash
# Tạo .env với các biến bắt buộc (xem compose.yaml)
docker compose up -d
```

---

## 9. Deploy online lên Fly.io (để Claude.ai kết nối được)

`stdio` chỉ chạy local — Claude.ai (web) cần một **public HTTPS URL**. Cách nhanh nhất: Fly.io.

```bash
# 1. Cài fly CLI (một lần)
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"

# 2. Login (mở browser)
fly auth login

# 3. Deploy — script tự tạo app, volume KB, secret API key, rồi deploy
./deploy-fly.sh
```

Script in ra:
- URL: `https://<app-name>.fly.dev/mcp`
- `MCP_API_KEY` (lưu lại — chỉ hiện 1 lần)

**Kết nối Claude.ai:**
1. claude.ai → **Settings → Connectors → Add custom connector**
2. URL: `https://<app-name>.fly.dev/mcp`
3. Header tùy chỉnh: `x-api-key: <MCP_API_KEY>`

> Nếu form Claude.ai **không có field nhập custom header** (chỉ có ô "Bearer token"/OAuth),
> đây là hạn chế UI của Claude.ai chứ không phải server. Workaround: đổi server sang
> `MCP_AUTH_MODE=jwt` và set `MCP_JWT_MAX_AGE_SECONDS=86400` (tối đa cho phép — đây là
> giới hạn cứng trong `src/config/env.ts`, không thể vượt quá 24h), nghĩa là phải tự
> mint lại JWT mỗi ngày bằng `jose` — kém tiện hơn `x-api-key` tĩnh. Ưu tiên thử
> `x-api-key` trước.

**Quản lý sau khi deploy:**
```bash
fly logs --app dps-superskills-mcp              # xem log
fly deploy --app dps-superskills-mcp --remote-only  # deploy lại sau khi sửa code
fly secrets set MCP_API_KEY=$(openssl rand -hex 32) --app dps-superskills-mcp  # đổi key
fly status --app dps-superskills-mcp            # trạng thái machine
```

KB data (`docs/superskills/*.md`) được lưu trên Fly volume `superskills_kb` — sống sót qua các lần deploy/restart.

---

## 10. Dev mode (hot reload)

```bash
pnpm dev
# tsx watch — server tự restart khi code thay đổi
```

---

## 11. Ví dụ sử dụng

```
# Tìm skill phù hợp theo keyword:
skill_search(query="debug")
→ systematic-debugging, pattern-globalize

skill_search(query="security")
→ specialist-review, privacy-secrets-gate, audit-design

# Invoke skill với task context:
skill_run(skill_name="complexity-gate", task_description="Thêm auth vào API endpoint")
→ Nhận: COMPLEXITY tier (C0–C4) + required skills cho tier đó

skill_run(skill_name="brainstorming", task_description="Design notification system", context="Next.js, PostgreSQL", depth="checklist")
→ Nhận: 9-step checklist + gotchas + output template (~800 tokens)

skill_run(skill_name="systematic-debugging", error_message="TypeError: Cannot read 'userId'", depth="nano")
→ Nhận: compressed 4-phase debug workflow (~200 tokens)

# Generate subagent prompt:
skill_dispatch(task_description="Implement OAuth flow", complexity_tier="C3", role="implementer")
→ Nhận: prompt template với nano refs cho tất cả C3 skills preloaded

# Ghi knowledge vào KB:
kb_write(category="gotcha", slug="async-missing-await", content="Dùng async handler mà thiếu await gây silent failure trong Express middleware")
→ KB entry tự inject vào future skill_run responses

# Update entry KB:
kb_update(category="gotcha", slug="async-missing-await", content="Updated: thiếu await trong Express middleware và Next.js Route Handlers")

# Query KB:
kb_query(query="async", detail=true)
→ Tất cả entries liên quan đến async

# Health check KB:
kb_health()
→ Entry counts per category, stale entries (>90 days), coverage gaps
```

---

## 12. Danh sách 31 Skills

**DISCIPLINE** (Iron Laws — non-negotiable):
`complexity-gate` · `tdd-verified` · `verification-before-completion` · `context-reanchor` · `epistemic-health-check` · `privacy-secrets-gate`

**TECHNIQUE** (Goal + constraints — adapt approach):
`brainstorming` · `dps-init` · `audit-design` · `dps-promote` · `writing-plans` · `task-risk-score`
`systematic-debugging` · `pattern-globalize` · `specialist-review` · `release-readiness`
`subagent-driven-development` · `executing-plans` · `dispatching-parallel-agents`
`receiving-code-review` · `using-git-worktrees` · `session-handoff`

**KNOWLEDGE LAYER** (Cross-cycle compounding):
`domain-alignment` · `knowledge-compound` · `audit-distill` · `adr-commit`

**REFERENCE** (Lookup only):
`kb-query` · `skill-init` · `writing-super-skills` · `framework-doctor` · `using-super-skills`

---

## 13. Troubleshooting

| Triệu chứng | Nguyên nhân | Fix |
|-------------|-------------|-----|
| `kb_write` bị từ chối với "safe mode blocked" | `MCP_SAFE_MODE=true` | Set `MCP_SAFE_MODE=false` trong config |
| Chỉ thấy `ping` và `pattern_debt`, không có skill tools | `MCP_PLUGIN_ALLOWLIST` sai | Thêm `skills.tool.js,knowledge.tool.js` vào allowlist |
| Skills không load: "Skills directory not accessible" | `MCP_SKILLS_PATH` sai hoặc không build | Chạy `pnpm build`, hoặc set `MCP_SKILLS_PATH` đúng |
| Resources không xuất hiện trong IDE | `MCP_ENABLE_SKILL_RESOURCES=false` | Set `MCP_ENABLE_SKILL_RESOURCES=true` |
| Server crash khi start | Node version < 18 | Dùng Node.js ≥ 18 (đang dùng: `node --version`) |
| HTTP 401 dù đã gửi `Authorization: Bearer <key>` | `MCP_AUTH_MODE=api_key` chỉ đọc header `x-api-key`, không đọc `Authorization` | Đổi sang header `x-api-key: <key>` |
| HTTP 400 "Mcp-Method header is required" | Protocol rc2026 strict mode | Thêm header `Mcp-Method: <method>` khớp với `body.method` (vd. `tools/list`) |
| HTTP 406 "Client must accept both..." | Thiếu Accept header | Thêm `Accept: application/json, text/event-stream` |
| `FATAL: Native MCP Tasks require durable Redis storage in production` | `NODE_ENV=production` + `STORAGE_DRIVER` khác `redis` | Bỏ `NODE_ENV=production` (dùng cho personal/Fly.io deploy) hoặc đổi `STORAGE_DRIVER=redis` |
