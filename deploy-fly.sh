#!/usr/bin/env bash
# DPS-Superskills — Fly.io deploy script
# Run once to create app + volume + secrets, then deploys.
# Subsequent deploys: just `fly deploy`

set -euo pipefail

APP="${FLY_APP_NAME:-dps-superskills-mcp}"
REGION="${FLY_REGION:-sin}"
VOLUME_NAME="superskills_kb"
VOLUME_SIZE="${FLY_VOLUME_SIZE:-1}"   # GB

export PATH="$HOME/.fly/bin:$PATH"

# ── Preflight ─────────────────────────────────────────────────────────────────

echo ""
echo "=== DPS-Superskills — Fly.io Deploy ==="
echo "  App:    $APP"
echo "  Region: $REGION"
echo ""

if ! command -v fly &>/dev/null; then
  echo "ERROR: fly CLI not found. Run: curl -L https://fly.io/install.sh | sh"
  exit 1
fi

if ! fly auth whoami &>/dev/null; then
  echo "Not logged in to Fly.io. Opening browser..."
  fly auth login
fi

echo "Logged in as: $(fly auth whoami)"
echo ""

# ── Create app (skip if exists) ───────────────────────────────────────────────

if fly apps list 2>/dev/null | grep -q "^$APP "; then
  echo "App '$APP' already exists — skipping create."
else
  echo "Creating app '$APP' in region '$REGION'..."
  fly apps create "$APP" --org personal 2>/dev/null || {
    echo ""
    echo "ERROR: App name '$APP' may be taken on Fly.io."
    echo "Change FLY_APP_NAME and update fly.toml [app] field, then re-run."
    echo "  Example: FLY_APP_NAME=my-dps-skills ./deploy-fly.sh"
    exit 1
  }
  echo "App created."

  # Update fly.toml app name if different from default
  if [ "$APP" != "dps-superskills-mcp" ]; then
    sed -i "s/^app = .*/app = \"$APP\"/" fly.toml
    echo "Updated fly.toml app name to '$APP'."
  fi
fi

# ── Set ALLOWED_HOSTS and ALLOWED_ORIGINS (now we know the hostname) ──────────

FLY_HOSTNAME="${APP}.fly.dev"
echo "Setting ALLOWED_HOSTS=$FLY_HOSTNAME ..."
fly secrets set \
  "ALLOWED_HOSTS=${FLY_HOSTNAME}" \
  "ALLOWED_ORIGINS=https://claude.ai,https://app.cursor.sh" \
  --app "$APP"

# ── Generate or reuse API key ─────────────────────────────────────────────────

EXISTING_KEY=$(fly secrets list --app "$APP" 2>/dev/null | grep "MCP_API_KEY" || true)
if [ -n "$EXISTING_KEY" ]; then
  echo "MCP_API_KEY already set — keeping existing key."
  echo "(To rotate: fly secrets set MCP_API_KEY=\$(openssl rand -hex 32) --app $APP)"
else
  API_KEY=$(openssl rand -hex 32)
  echo "Setting MCP_API_KEY secret..."
  fly secrets set "MCP_API_KEY=${API_KEY}" --app "$APP"
  echo ""
  echo "=========================================================="
  echo "  SAVE THIS API KEY — shown only once:"
  echo ""
  echo "  MCP_API_KEY = $API_KEY"
  echo ""
  echo "  You will need this to connect Claude.ai and other clients."
  echo "=========================================================="
  echo ""
fi

# ── Create persistent volume (skip if exists) ─────────────────────────────────

if fly volumes list --app "$APP" 2>/dev/null | grep -q "$VOLUME_NAME"; then
  echo "Volume '$VOLUME_NAME' already exists — skipping create."
else
  echo "Creating ${VOLUME_SIZE}GB volume '$VOLUME_NAME' in region '$REGION'..."
  fly volumes create "$VOLUME_NAME" \
    --size "$VOLUME_SIZE" \
    --region "$REGION" \
    --app "$APP" \
    --yes
  echo "Volume created."
fi

# ── Deploy ────────────────────────────────────────────────────────────────────

echo ""
echo "Deploying to Fly.io (this may take 2-3 minutes on first deploy)..."
fly deploy --app "$APP" --remote-only

# ── Post-deploy summary ───────────────────────────────────────────────────────

echo ""
echo "=========================================================="
echo " DEPLOY COMPLETE"
echo "=========================================================="
echo ""
echo " MCP Endpoint: https://${FLY_HOSTNAME}/mcp"
echo " Health check: https://${FLY_HOSTNAME}/health/liveness"
echo " Server card:  https://${FLY_HOSTNAME}/.well-known/mcp.json"
echo ""
echo " --- Connect Claude.ai Claude Code ---"
echo " 1. Go to claude.ai -> Settings -> Connectors -> Add custom connector"
echo " 2. URL:    https://${FLY_HOSTNAME}/mcp"
echo " 3. Header: x-api-key: <the MCP_API_KEY shown above>"
echo "    (this server uses MCP_AUTH_MODE=api_key -> header is 'x-api-key',"
echo "     NOT 'Authorization: Bearer'. If the Claude.ai form has no custom"
echo "     header field, see docs/MCP-CONNECT.md section 9 for the JWT fallback.)"
echo ""
echo " --- Connect other IDEs (Cursor, VS Code, etc.) ---"
echo " See docs/MCP-CONNECT.md section 8 (HTTP mode) for configs."
echo " Use URL: https://${FLY_HOSTNAME}/mcp"
echo ""
echo " --- View logs ---"
echo " fly logs --app $APP"
echo ""
echo " --- Redeploy after code changes ---"
echo " fly deploy --app $APP --remote-only"
echo "=========================================================="
