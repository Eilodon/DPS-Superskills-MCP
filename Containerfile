FROM docker.io/library/node:20-alpine AS builder

ARG PNPM_VERSION=9.15.9
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build && pnpm prune --prod

FROM docker.io/library/node:20-alpine AS runtime

# NODE_ENV is intentionally NOT baked in here — it gates a strict enterprise
# tier in src/config/env.ts (forces Redis storage, JWT/OIDC-only auth, plugin
# SHA256 pinning, KMS). Set NODE_ENV=production at the deployment layer
# (compose.yaml, fly.toml) only when that full posture is actually wanted.
WORKDIR /app

COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
# Skills content (read-only, baked into image)
# KB storage (docs/superskills/) is intentionally excluded — mount a volume there
COPY --from=builder --chown=node:node /app/docs/DPS-superskills-v5.2.1 ./docs/DPS-superskills-v5.2.1

USER node
ENTRYPOINT ["node", "dist/index.js"]
