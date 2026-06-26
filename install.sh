#!/usr/bin/env bash
# DPS-Superskills MCP Server — install + config generator
# Builds the server and prints ready-to-paste configs with absolute paths for each IDE.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$SCRIPT_DIR/dist/index.js"

echo ""
echo "=== DPS-Superskills MCP Server — Install ==="
echo ""

# Node version check
if ! command -v node &>/dev/null; then
  echo "ERROR: node not found. Install Node.js >= 18 first."
  exit 1
fi
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: Node.js >= 18 required (found: $(node --version))."
  exit 1
fi

# Ensure pnpm
if ! command -v pnpm &>/dev/null; then
  echo "pnpm not found — enabling via corepack..."
  corepack enable pnpm
fi

# Build
echo "Building..."
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile --silent
pnpm build 2>&1 | grep -v "^$" || true

if [ ! -f "$DIST" ]; then
  echo "ERROR: Build failed — dist/index.js not found."
  exit 1
fi
echo "Build OK: $DIST"
echo ""

# Shared env vars (MCP_SAFE_MODE=false enables dps_check, which spawns python3)
read -r -d '' ENV_STDIO <<ENVEOF || true
        "TRANSPORT_DRIVER": "stdio",
        "STORAGE_DRIVER": "fs",
        "MCP_SAFE_MODE": "false",
        "MCP_PLUGIN_ALLOWLIST": "system.tool.js,skills.tool.js,knowledge.tool.js,code_index.tool.js,dps.tool.js",
        "MCP_PLUGIN_ISOLATION_MODE": "policy",
        "MCP_ENABLE_SKILL_RESOURCES": "true",
        "MCP_PROJECT_ID": "dps-superskills",
        "MCP_TENANT_ID": "tenant_local"
ENVEOF

# ── Claude Desktop / Claude Code / AntiGravity / Codex ───────────────────────
echo "============================================================"
echo " CONFIG: Claude Desktop / Claude Code / AntiGravity / Codex"
echo "  Linux:     ~/.config/claude/claude_desktop_config.json"
echo "  macOS:     ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "  Claude Code (project): .claude/settings.json"
echo "  Claude Code (global):  ~/.claude/settings.json"
echo "============================================================"
cat <<CONFIG
{
  "mcpServers": {
    "dps-superskills": {
      "command": "node",
      "args": ["$DIST"],
      "env": {
$ENV_STDIO
      }
    }
  }
}
CONFIG

# ── Cursor ────────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo " CONFIG: Cursor"
echo "  Global:      ~/.cursor/mcp.json"
echo "  Per-project: <project>/.cursor/mcp.json"
echo "============================================================"
cat <<CONFIG
{
  "dps-superskills": {
    "command": "node",
    "args": ["$DIST"],
    "env": {
$ENV_STDIO
    }
  }
}
CONFIG

# ── VS Code ───────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo " CONFIG: VS Code (MCP extension)"
echo "  File: .vscode/mcp.json  OR  User settings.json (mcp block)"
echo "============================================================"
cat <<CONFIG
{
  "mcp": {
    "servers": {
      "dps-superskills": {
        "command": "node",
        "args": ["$DIST"],
        "env": {
$ENV_STDIO
        }
      }
    }
  }
}
CONFIG

# ── Windsurf ──────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo " CONFIG: Windsurf"
echo "  File: ~/.codeium/windsurf/mcp_config.json"
echo "============================================================"
cat <<CONFIG
{
  "mcpServers": {
    "dps-superskills": {
      "command": "node",
      "args": ["$DIST"],
      "env": {
$ENV_STDIO
      }
    }
  }
}
CONFIG

echo ""
echo "============================================================"
echo " DONE — copy the config block for your IDE above."
echo " See docs/MCP-CONNECT.md for HTTP mode, Docker, and usage examples."
echo "============================================================"
echo ""
