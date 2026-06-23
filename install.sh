#!/usr/bin/env bash
set -e

# Detect the absolute path of the current directory
SERVER_DIR="$(pwd)"
INDEX_PATH="${SERVER_DIR}/dist/index.js"

echo "=========================================================="
echo "    DPS SuperSkills MCP Server — Client Configuration     "
echo "=========================================================="

if [ ! -f "$INDEX_PATH" ]; then
    echo "⚠️  Warning: dist/index.js not found."
    echo "   You should run 'pnpm install && pnpm build' before connecting clients."
    echo "=========================================================="
fi

echo ""
echo "Copy the following JSON block into your MCP client config"
echo "(e.g., Claude Desktop or Cursor MCP settings):"
echo ""
cat <<EOF
{
  "mcpServers": {
    "dps-superskills": {
      "command": "node",
      "args": ["${INDEX_PATH}"],
      "env": {
        "TRANSPORT_DRIVER": "stdio",
        "STORAGE_DRIVER": "fs",
        "MCP_SAFE_MODE": "true",
        "MCP_PLUGIN_ALLOWLIST": "system.tool.js,skills.tool.js",
        "MCP_ENABLE_SKILL_RESOURCES": "true"
      }
    }
  }
}
EOF
echo ""
echo "✅ Config generated successfully!"
