# DPS SuperSkills MCP Server

**DPS SuperSkills v5.2.1** deployed as an MCP server — exposes 16 MCP tools plus 31 read-only skill resources for any MCP-compatible client (Claude Desktop, Cursor, VS Code, Windsurf, Antigravity, or any IDE/chatbot supporting MCP).

> Package: `dps-superskills-mcp`
> Default transport: `stdio`
> Skills content: `docs/DPS-superskills-v5.2.1/` (31 skills, 31 nano references)
> Runtime entrypoint: `dist/index.js`
> Base layer: SUPER-MCP Framework (TypeScript / ESM)

---

## DPS SuperSkills — MCP Tools & Resources

This server exposes both **MCP Tools** (for on-demand invocation) and **MCP Resources** (for context auto-injection) to give any AI agent structured access to the full DPS SuperSkills v5.2.1 framework.

### MCP Resources

All 31 skills are exposed as read-only MCP Resources at `skill://<name>` (for example, `skill://using-super-skills` or `skill://complexity-gate`). Resource annotations prioritize DISCIPLINE skills so clients that support resource ranking can inject the Iron Laws first.
Compatible MCP clients can discover the `skill://{skill_name}` template, call `resources/list`, and read individual skills with `resources/read`. When resources are enabled, the server advertises standard MCP `resources` capability during `initialize`.

*Note: Resources inherit the SUPER-MCP governance pipeline scaled by endpoint: `resources/read` enforces rate-limiting, quota, and Output Firewall (like Tools); `resources/list` enforces rate-limiting and quota; `resources/templates/list` is lightweight discovery. Enabled by default; can be disabled via `MCP_ENABLE_SKILL_RESOURCES=false`.*

### MCP Tools

**Skills** (`skills.tool.js` — 5 tools)

| MCP Tool | Purpose |
|---|---|
| `skill_list` | List all 31 skills with descriptions, register (DISCIPLINE / TECHNIQUE / KNOWLEDGE LAYER / REFERENCE), and curated `suggested next:` routing hints. Optionally filter by register. |
| `skill_read` | Return the full SKILL.md content for a specific skill. Optionally include nano (compressed) version. |
| `skill_run` | Invoke a skill with caller context. Returns the structured workflow (ANNOUNCE, GOAL, CONSTRAINTS, CHECKLIST, OUTPUT TEMPLATE, active GOTCHAS, NANO REFERENCE) scaled by `depth` (`nano` / `checklist` / `full`). Set `format="json"` to also receive a `structuredContent` payload for agent-to-agent dispatch. |
| `skill_dispatch` | Generate a role-specific prompt template (implementer / reviewer / specialist) for spawning a focused subagent, pre-loaded with tier-appropriate skills and nano references. C0 tasks return a simplified "implement directly" prompt. |
| `skill_search` | Search skills by keyword across names, descriptions, and registers. Use when unsure which skill applies — faster than reading `skill_list` manually. |

**Knowledge base** (`knowledge.tool.js` — 4 tools, persistent cross-session memory)

| MCP Tool | Purpose |
|---|---|
| `kb_write` | Record a single knowledge entry (`gotcha` / `pattern-debt` / `domain-term` / `decision` / `bug-pattern`) to `docs/superskills/<category>.md` by default, or `MCP_KB_PATH/<category>.md` when overridden. Slug is validated as kebab-case. Active gotchas auto-inject into future `skill_run` responses. |
| `kb_update` | Update an existing KB entry in-place by slug. Use when a gotcha or decision is no longer accurate and needs replacing. |
| `kb_query` | Search the KB. Default returns a compact `id + 1-line summary` per match (token-efficient); pass `detail=true` for full entry bodies. Supports `category` filter and `limit`. |
| `kb_health` | Report entry counts per category, flag stale entries (>90 days), and surface coverage gaps. |

**Code retrieval** (`code_index.tool.js` — 3 tools, local data-plane over the user's repo)

| MCP Tool | Purpose |
|---|---|
| `code_search` | Semantic-ish local code search (native zero-dependency BM25 + symbol/path/proximity rerank). Use **instead of grep+read** to locate where something is implemented — returns the most relevant chunks as `path:line` + a match-centred preview, typically **~80–97% fewer tokens**. Auto-builds the index on first use (gitignored cache in `<workspace>/.dps/index/`; disable with `MCP_INDEX_AUTO=false`). Fuses DPS spec files (`source=spec`) when present. |
| `code_index` | Build / incrementally refresh the local index. Only changed files (size+mtime) are re-read; a no-op refresh short-circuits in ~25ms. |
| `code_index_status` | Report whether the index exists, its manifest, and how stale it is (added/modified/removed files). |

**DPS living-spec** (`dps.tool.js` — 2 tools)

| MCP Tool | Purpose |
|---|---|
| `dps_init` | Initialize/inject the 4 DPS living-spec files (README/CONTRACTS/BLUEPRINT/ADR) into `<workspace>/.dps/spec/` from the bootstrap templates. Detects an existing spec and asks for consent (MCP elicitation, or explicit `confirm=true`). Pure filesystem → runs under safe mode. |
| `dps_check` | Validate the DPS spec via `dps.py` (every `Ref<X>` resolves to CONTRACTS, single-definition rule, version sync). Requires `python3` (degrades to a manual checklist). Spawns a process → **disabled under `MCP_SAFE_MODE=true`**. |

**System** (`system.tool.js` — 2 tools)

| MCP Tool | Purpose |
|---|---|
| `super_mcp_ping` | Health check — confirm the server is alive and responding. |
| `super_mcp_pattern_debt` | View the active pattern-debt registry. |

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

### Manual Configuration (Claude Desktop / Claude Code / Cursor / Antigravity / Codex)

Replace `<absolute-path-to>` with your actual full path, or run `./install.sh` to get it pre-filled.

> **`MCP_SAFE_MODE=false` is required** for `dps_check` (it spawns `python3` — `process.spawn` is blocked in safe mode). Everything else runs under safe mode: `kb_write` / `kb_update` use the local `kb.write` capability, and `code_search` / `code_index` / `dps_init` only write into the workspace (`fs.write.workspace`). Use `false` when you want the full tool set including `dps_check`; use `true` for the smallest local permission profile when you do not need DPS linting.
>
> **`MCP_WORKSPACE_ROOT`** — the code retrieval + DPS tools operate on the user's project. Under `stdio` they default to the server's working directory (`process.cwd()`); if your IDE does not launch the server with the project as cwd, set `MCP_WORKSPACE_ROOT` to the absolute project path. Under `http` (remote/control-plane) the indexer disables itself.

```json
{
  "mcpServers": {
    "dps-superskills": {
      "command": "node",
      "args": ["<absolute-path-to>/DPS-Superskills/dist/index.js"],
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

### Cursor (`~/.cursor/mcp.json` or `.cursor/mcp.json`)

```json
{
  "dps-superskills": {
    "command": "node",
    "args": ["<absolute-path-to>/DPS-Superskills/dist/index.js"],
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

---

## Quick Start

```bash
# Option A — auto build + print IDE configs with your absolute paths:
./install.sh

# Option B — manual:
pnpm install --frozen-lockfile
pnpm build
# Then copy a config block from docs/MCP-CONNECT.md into your IDE
```

---

## Project Structure

```text
.
├── docs/DPS-superskills-v5.2.1/         <- 31 skills content (SKILL.md + nano.md)
│   ├── <skill-name>/SKILL.md
│   ├── <skill-name>/<skill-name>.nano.md
│   ├── shared/                          <- gotcha-schema, claim-grammar, etc.
│   ├── bootstrap-templates/
│   ├── quickstarts/
│   ├── tools/
│   └── README.md
├── docs/MCP-CONNECT.md                  <- IDE connection guide (all configs)
├── install.sh                           <- build + print IDE configs with abs paths
└── src/
    ├── index.ts
    ├── skills/                          <- DPS SuperSkills MCP bridge layer
    │   ├── skill_loader.ts              <- SKILL.md / nano.md parser + cache
    │   ├── skill_registry.ts            <- 31-skill static registry
    │   └── skill_executor.ts            <- structured workflow formatter
    ├── plugins/
    │   ├── skills.tool.ts               <- skill_list, skill_read, skill_run, skill_dispatch, skill_search
    │   ├── knowledge.tool.ts            <- kb_write, kb_update, kb_query, kb_health
    │   ├── code_index.tool.ts           <- code_search, code_index, code_index_status
    │   ├── dps.tool.ts                  <- dps_init, dps_check
    │   └── system.tool.ts               <- super_mcp_ping, super_mcp_pattern_debt
    ├── core/indexer/                    <- zero-dep BM25 code retrieval (walker, chunker, bm25, store)
    ├── core/dps/                        <- DPS spec scaffold + dps.py wrapper (init.ts)
    └── ...                              <- Layer 0 (SUPER-MCP runtime)
```

At runtime, the code-retrieval + DPS tools materialize a folder inside the **user's own project** (never this repo):

```text
<user-project>/.dps/
├── spec/        <- DPS living-spec: README/CONTRACTS/BLUEPRINT/ADR.md (tracked)
├── agent/       <- generated projection sidecars (tracked)
├── index/       <- local code index cache (gitignored)
└── DPS_INDEX.yml, DPS_LOCK.yml
```

By default the server reads skills from `<project_root>/docs/DPS-superskills-v5.2.1`. Override with:

```env
MCP_SKILLS_PATH=/custom/path/to/skills
```

The persistent knowledge base defaults to `<project_root>/docs/superskills`. Override it when you want project-local or test-isolated KB files:

```env
MCP_KB_PATH=/abs/path/to/docs/superskills
```

Code-retrieval / DPS tools:

```env
# Project root the indexer + DPS tools operate on (defaults to cwd under stdio).
MCP_WORKSPACE_ROOT=/abs/path/to/your/project
# Set false to stop code_search from auto-building the index on first use.
MCP_INDEX_AUTO=true
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
