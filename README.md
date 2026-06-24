# DPS SuperSkills MCP Server

**DPS SuperSkills v5.2.1** deployed as an MCP server — exposes 31 high-assurance agentic coding skills as tools for any MCP-compatible client (Claude Desktop, Cursor, VS Code, Windsurf, Antigravity, or any IDE/chatbot supporting MCP).

> Package: `dps-superskills-mcp`
> Default transport: `stdio`
> Skills content: `docs/DPS-superskills-v5.2.1/` (31 skills, 31 nano references)
> Runtime entrypoint: `dist/index.js`
> Base layer: SUPER-MCP Framework (TypeScript / ESM)

---

## DPS SuperSkills — MCP Tools & Resources

This server exposes both **MCP Tools** (for on-demand invocation) and **MCP Resources** (for context auto-injection) to give any AI agent structured access to the full DPS SuperSkills v5.2.1 framework.

### MCP Resources

DISCIPLINE skills (the Iron Laws) are automatically exposed as read-only MCP Resources at `skill://<name>` (e.g., `skill://using-super-skills`). 
Compatible MCP clients (like Claude Desktop and Cursor) can automatically inject these high-priority resources into the LLM's system context at the start of a session, enforcing the rules without requiring the model to explicitly call a tool first.

*Note: Resources are fully protected by the same rate-limiting, quota, and Output Firewall pipelines as Tools. Enabled by default; can be disabled via `MCP_ENABLE_SKILL_RESOURCES=false`.*

### MCP Tools

**Skills**

| MCP Tool | Purpose |
|---|---|
| `skill_list` | List all 31 skills with descriptions, register (DISCIPLINE / TECHNIQUE / KNOWLEDGE LAYER / REFERENCE), and curated `suggested next:` routing hints. Optionally filter by register. |
| `skill_read` | Return the full SKILL.md content for a specific skill. Optionally include nano (compressed) version. |
| `skill_run` | Invoke a skill with caller context. Returns the structured workflow (ANNOUNCE, GOAL, CONSTRAINTS, CHECKLIST, OUTPUT TEMPLATE, active GOTCHAS, NANO REFERENCE) scaled by `depth` (`nano` / `checklist` / `full`). Set `format="json"` to also receive a `structuredContent` payload for agent-to-agent dispatch. |
| `skill_dispatch` | Generate a role-specific prompt template (implementer / reviewer / specialist) for spawning a focused subagent, pre-loaded with tier-appropriate skills and nano references. C0 tasks return a simplified "implement directly" prompt. |

**Knowledge base** (persistent cross-session memory)

| MCP Tool | Purpose |
|---|---|
| `kb_write` | Record a single knowledge entry (`gotcha` / `pattern-debt` / `domain-term` / `decision` / `bug-pattern`) to `docs/superskills/<category>.md`. Slug is validated as kebab-case. Active gotchas auto-inject into future `skill_run` responses. |
| `kb_query` | Search the KB. Default returns a compact `id + 1-line summary` per match (token-efficient); pass `detail=true` for full entry bodies. Supports `category` filter and `limit`. |
| `kb_health` | Report entry counts per category, flag stale entries (>90 days), and surface coverage gaps. |

### 31 Skills Available

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

## Client Configuration

**To automatically generate the correct configuration with absolute paths for your environment, run:**

```bash
./install.sh
```

### Manual Configuration (Claude Desktop / Cursor / Antigravity)

If configuring manually, replace `<absolute-path-to>` with your actual full path:

```json
{
  "mcpServers": {
    "dps-superskills": {
      "command": "node",
      "args": ["<absolute-path-to>/DPS-Superskills/dist/index.js"],
      "env": {
        "TRANSPORT_DRIVER": "stdio",
        "STORAGE_DRIVER": "fs",
        "MCP_SAFE_MODE": "true",
        "MCP_PLUGIN_ALLOWLIST": "system.tool.js,skills.tool.js,knowledge.tool.js",
        "MCP_ENABLE_SKILL_RESOURCES": "true"
      }
    }
  }
}
```

### VS Code / Windsurf (stdio)

```json
{
  "mcp": {
    "servers": {
      "dps-superskills": {
        "command": "node",
        "args": ["<absolute-path-to>/DPS-Superskills/dist/index.js"],
        "env": {
          "TRANSPORT_DRIVER": "stdio",
          "STORAGE_DRIVER": "fs",
          "MCP_SAFE_MODE": "true",
          "MCP_PLUGIN_ALLOWLIST": "system.tool.js,skills.tool.js,knowledge.tool.js",
          "MCP_ENABLE_SKILL_RESOURCES": "true"
        }
      }
    }
  }
}
```

---

## Quick Start

```bash
pnpm install --frozen-lockfile
pnpm build
# Server is now ready for MCP client connections via stdio
```

---

## Project Structure

```text
.
├── docs/DPS-superskills-v5.2.1/    ← 31 skills content (SKILL.md + nano.md)
│   ├── <skill-name>/SKILL.md
│   ├── <skill-name>/<skill-name>.nano.md
│   ├── shared/                 ← gotcha-schema, claim-grammar, etc.
│   ├── bootstrap-templates/
│   ├── quickstarts/
│   ├── tools/
│   └── README.md
└── src/
    ├── index.ts
    ├── skills/                      ← DPS SuperSkills MCP bridge layer
    │   ├── skill_loader.ts          ← SKILL.md / nano.md parser
    │   ├── skill_registry.ts        ← 31-skill static registry
    │   └── skill_executor.ts        ← structured workflow formatter
    ├── plugins/
    │   ├── skills.tool.ts           ← skill_list, skill_read, skill_run, skill_dispatch
    │   ├── knowledge.tool.ts        ← kb_write, kb_query, kb_health (persistent KB)
    │   └── system.tool.ts           ← ping, pattern_debt, test_long_task
    └── ...                          ← Layer 0 (SUPER-MCP runtime)
```

By default the server reads skills from `<project_root>/docs/DPS-superskills-v5.2.1`. Override with:

```env
MCP_SKILLS_PATH=/custom/path/to/skills
```

---

## Layer 0: SUPER-MCP Runtime

This MCP server is built on top of the hardened **SUPER-MCP Boilerplate** (Layer 0). 

While the primary focus of this project is the DPS SuperSkills implementation, the underlying architecture provides:
- **Dual transports**: Native support for both `stdio` and `http`.
- **Durable Storage**: Extensible storage (fs, Redis) for task and state persistence.
- **Output Firewall**: Redaction of sensitive data before returning to the LLM.
- **Security Primitives**: Capability-based safety policies (`MCP_SAFE_MODE`), plugin allowlisting, and native tasks support.

*(Note: Advanced configuration options for Redis, KMS encryption, OAuth, and HTTP deployments inherited from SUPER-MCP are supported but omitted from this README for brevity, as the standard local `stdio` usage is recommended for IDEs and Chatbots).*
