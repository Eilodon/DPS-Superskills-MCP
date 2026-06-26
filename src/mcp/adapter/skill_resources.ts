/**
 * skill_resources.ts — MCP Resources endpoint for DPS SuperSkills.
 *
 * Exposes all registered skills as MCP Resources so
 * clients can auto-inject them into the LLM context window without requiring
 * the model to call a Tool first.
 *
 * Security: Resources go through the same rate-limit, quota, and output-firewall
 * primitives used by Tools. They do NOT bypass the SUPER-MCP security pipeline.
 *
 * Uses the existing `setRawRequestHandler` pattern (same as tasks/get, tasks/update).
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/server";
import { ENV } from "../../config/env.js";
import { getRequestContext } from "../../security/context.js";
import { globalRateLimiter } from "../../middlewares/rate_limit.js";
import { globalQuotaManager } from "../../middlewares/quota.js";
import { scanToolOutput } from "../../middlewares/output_firewall.js";
import { telemetry } from "../../telemetry/factory.js";
import { SKILL_REGISTRY, SKILL_MAP, type SkillMeta } from "../../skills/skill_registry.js";
import { skillsBasePath } from "../../skills/skill_loader.js";

// ---------------------------------------------------------------------------
// URI scheme: skill://<skill-name>
// Strict regex — no path traversal, no special characters.
// ---------------------------------------------------------------------------

const SKILL_URI_RE = /^skill:\/\/([a-z][a-z0-9-]*)$/;

function parseSkillUri(uri: string | undefined): string | null {
  if (!uri) return null;
  const m = SKILL_URI_RE.exec(uri);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Resource metadata for resources/list
// ---------------------------------------------------------------------------

function skillPriority(meta: SkillMeta): number {
  // DISCIPLINE skills get highest priority — they are non-negotiable Iron Laws
  // that clients SHOULD inject into every session.
  if (meta.register === "DISCIPLINE") return 1.0;
  if (meta.register === "KNOWLEDGE LAYER") return 0.6;
  if (meta.register === "TECHNIQUE") return 0.5;
  return 0.4; // REFERENCE
}

function buildResourceList(): unknown[] {
  return SKILL_REGISTRY.map((skill) => ({
    uri: `skill://${skill.name}`,
    name: skill.name,
    title: `[${skill.register}] ${skill.name}`,
    description: skill.description,
    mimeType: "text/markdown",
    annotations: {
      audience: ["assistant"],
      priority: skillPriority(skill),
    },
  }));
}

// ---------------------------------------------------------------------------
// Security middleware — same primitives as Tool execution pipeline
// ---------------------------------------------------------------------------

async function enforceGovernance(resourceUri: string): Promise<void> {
  const ctx = getRequestContext();

  const rl = await globalRateLimiter.check(ctx.tenantId);
  if (!rl.allowed) {
    await telemetry.log("resource_rate_limit_exceeded", {
      tenantId: ctx.tenantId,
      uri: resourceUri,
    });
    throw Object.assign(
      new Error(`[SUPER-MCP] Rate limit exceeded. Retry after ${rl.retryAfterMs}ms.`),
      { code: -32000 },
    );
  }

  const quota = await globalQuotaManager.check(ctx.tenantId);
  if (!quota.allowed) {
    await telemetry.log("resource_quota_exceeded", {
      tenantId: ctx.tenantId,
      uri: resourceUri,
      used: quota.used,
    });
    throw Object.assign(
      new Error(`[SUPER-MCP] Quota exceeded.`),
      { code: -32000 },
    );
  }
}

// ---------------------------------------------------------------------------
// Registration — uses the same setRawRequestHandler pattern as tasks/get
// ---------------------------------------------------------------------------

// Import the private helper from the same adapter module.
// It writes directly into the SDK's _requestHandlers map.
type RequestHandler = (request: { params?: unknown }) => Promise<unknown>;

function setRawResourceHandler(server: McpServer, method: string, handler: RequestHandler): void {
  const rawServer = (server as unknown as {
    server?: {
      _requestHandlers?: Map<string, (request: unknown, ctx?: unknown) => Promise<unknown>>;
      setRequestHandler?: (...args: unknown[]) => unknown;
    };
  }).server;
  if (!rawServer) {
    throw new Error(`[SUPER-MCP] SDK server is unavailable; cannot register MCP method '${method}'.`);
  }

  if (rawServer._requestHandlers instanceof Map) {
    rawServer._requestHandlers.set(method, async (request: unknown, _ctx?: unknown) =>
      handler({ params: (request as { params?: unknown } | undefined)?.params }),
    );
    return;
  }

  if (!rawServer.setRequestHandler) {
    throw new Error(`[SUPER-MCP] SDK server does not expose a request handler registry; cannot register MCP method '${method}'.`);
  }
  rawServer.setRequestHandler(method, async (request: { params?: unknown }) =>
    handler({ params: request?.params }) as unknown,
  );
}

export function registerSkillResources(server: McpServer): void {
  if (!ENV.MCP_ENABLE_SKILL_RESOURCES) {
    return;
  }

  server.server.registerCapabilities({
    resources: {
      listChanged: server.server.getCapabilities().resources?.listChanged ?? false,
    },
  });

  const basePath = skillsBasePath();

  // ── resources/list ──────────────────────────────────────────────────────
  setRawResourceHandler(server, "resources/list", async () => {
    // resources/list is lightweight catalog — no rate-limit needed here,
    // but we still enforce it for consistency.
    await enforceGovernance("skill://[list]");

    return { resources: buildResourceList() };
  });

  // ── resources/read ──────────────────────────────────────────────────────
  setRawResourceHandler(server, "resources/read", async (request) => {
    const params = request.params as { uri?: string } | undefined;
    const uri = params?.uri;

    // [1] URI whitelist — strict skill:// scheme, validated against SKILL_MAP
    const skillName = parseSkillUri(uri);
    if (!skillName || !SKILL_MAP.has(skillName)) {
      throw Object.assign(
        new Error(`Resource not found: ${uri ?? "(empty)"}`),
        { code: -32002, data: { uri } },
      );
    }

    // [2] Rate limit + Quota — same primitives as Tools
    await enforceGovernance(uri!);

    // [3] Read file — path-traversal safe because skillName is validated
    // against the static SKILL_MAP (only [a-z0-9-] chars).
    const skillFile = path.join(basePath, skillName, "SKILL.md");
    let text: string;
    try {
      text = await fs.readFile(skillFile, "utf-8");
    } catch {
      throw Object.assign(
        new Error(`Resource not found: ${uri}`),
        { code: -32002, data: { uri } },
      );
    }

    // [4] Output Firewall — same primitive as Tools
    const firewalled = scanToolOutput({
      content: [{ type: "text", text }],
    });

    if (firewalled.violations.length > 0) {
      await telemetry.log("resource_output_firewall_redacted", {
        uri,
        violations: firewalled.violations,
      });
    }

    await telemetry.log("resource_read", {
      tenantId: getRequestContext().tenantId,
      uri,
      skillName,
    });

    return {
      contents: [
        {
          uri: `skill://${skillName}`,
          mimeType: "text/markdown",
          text: firewalled.result.content[0]?.text ?? text,
        },
      ],
    };
  });

  // ── resources/templates/list ────────────────────────────────────────────
  // Expose a template so clients can discover the skill:// URI scheme.
  setRawResourceHandler(server, "resources/templates/list", async () => ({
    resourceTemplates: [
      {
        uriTemplate: "skill://{skill_name}",
        name: "DPS SuperSkill",
        title: "📘 DPS SuperSkill v5.2.1",
        description:
          "Read a DPS SuperSkill definition by name. " +
          "Use resources/list to see all available skill names.",
        mimeType: "text/markdown",
      },
    ],
  }));

  console.error(
    `[DPS-Superskills] MCP Resources registered: ${SKILL_REGISTRY.length} skills ` +
    `available at skill://<name> (rate-limited, firewall-protected)`,
  );
}
