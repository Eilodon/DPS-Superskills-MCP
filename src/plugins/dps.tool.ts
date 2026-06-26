import { z } from "zod/v4";
import type { ToolDefinition } from "../mcp/adapter/tool_registry.js";
import { resolveWorkspaceRoot } from "../core/indexer/index.js";
import { detectExistingSpec, scaffoldSpec, runDpsCheck, specDir } from "../core/dps/init.js";

/**
 * DPS spec lifecycle tools (data-plane, run in the USER's repo).
 *
 *  - dps_init  scaffolds the 4 living-spec files into <workspace>/.dps/spec/.
 *              Pure fs (fs.write.workspace) so it runs under safe mode; asks for
 *              consent via MCP elicitation when available, else requires confirm.
 *  - dps_check wraps the shipped dps.py validator (process.spawn → gated by safe
 *              mode like other spawn tools); degrades to a manual checklist when
 *              python3 is absent.
 */

const NO_WORKSPACE_MSG =
  "[dps] No local workspace. DPS spec is injected into the user's project and needs local " +
  "filesystem access — run via stdio transport or set MCP_WORKSPACE_ROOT. (HTTP is the control plane.)";

function text(t: string) {
  return { content: [{ type: "text" as const, text: t }] };
}
function noWorkspace() {
  return text(NO_WORKSPACE_MSG);
}

const MANUAL_FALLBACK =
  "Manual fallback checklist:\n" +
  "[ ] Every Ref<X> in BLUEPRINT resolves to a schema in CONTRACTS\n" +
  "[ ] BLUEPRINT does not redefine schemas owned by CONTRACTS\n" +
  "[ ] All 4 files share the same DPS status/profile\n" +
  "[ ] ADR fields complete; LOW-confidence items have a VALIDATION TARGET";

const dpsInitTool: ToolDefinition = {
  name: "dps_init",
  description:
    "Initialize/inject the DPS living-spec (README, CONTRACTS, BLUEPRINT, ADR) into " +
    "<workspace>/.dps/spec/ from the DPS bootstrap templates. Detects an existing spec and asks " +
    "for consent before writing. Use when a project should adopt DPS as living architecture knowledge; " +
    "after filling the files, code_search fuses them (source=spec) and dps_check validates them.",
  inputSchema: {
    confirm: z.boolean().optional().describe("Explicit consent to write into the repo. Required when the client has no interactive elicitation."),
    on_existing: z.enum(["skip", "overwrite"]).optional().describe("What to do if spec files already exist (default skip)."),
  },
  allowedPhases: ["intake", "execution"],
  capabilities: ["fs.read", "fs.write.workspace"],
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  execution: { taskSupport: "optional" },
  handler: async (args, _state, _signal, context) => {
    const root = resolveWorkspaceRoot();
    if (!root) return noWorkspace();
    const { confirm, on_existing } = args as { confirm?: boolean; on_existing?: "skip" | "overwrite" };

    const existing = await detectExistingSpec(root);
    let onExisting: "skip" | "overwrite" = on_existing ?? "skip";
    let consented = confirm === true;

    // Best-effort interactive consent (available only when run as an MCP task).
    if (context?.requestInput) {
      const msg = existing.length
        ? `DPS spec already exists at ${specDir(root)} (${existing.join(", ")}). Reply {"confirm":true,"on_existing":"overwrite"} to replace, or {"confirm":false} to cancel.`
        : `Initialize the DPS living-spec (README/CONTRACTS/BLUEPRINT/ADR) at ${specDir(root)}? Reply {"confirm":true} to proceed.`;
      const resp = (await context.requestInput(msg)) as Record<string, unknown> | undefined;
      if (resp && typeof resp === "object") {
        if (resp.confirm === true) consented = true;
        if (resp.confirm === false || resp.cancel === true || resp.action === "decline") consented = false;
        if (resp.on_existing === "overwrite") onExisting = "overwrite";
      }
    }

    if (!consented) {
      const how = context?.requestInput
        ? "Cancelled by user."
        : "Pass confirm=true to proceed (this client has no interactive prompt).";
      return text(`[dps_init] Not initialized. ${how}`);
    }
    if (existing.length && onExisting !== "overwrite") {
      return text(
        `[dps_init] DPS spec already present (${existing.join(", ")}) at ${specDir(root)}. ` +
        `Re-run with on_existing="overwrite" to replace, or just fill these in.`,
      );
    }

    const res = await scaffoldSpec(root, onExisting === "overwrite");
    return {
      content: [{
        type: "text",
        text:
          `[dps_init] DPS living-spec scaffolded at ${specDir(root)}\n` +
          `  created: ${res.created.join(", ") || "(none)"}\n` +
          (res.skipped.length ? `  skipped (existing): ${res.skipped.join(", ")}\n` : "") +
          `\nNext: fill the files — CONTRACTS = schemas (with \`dps:id\` markers); BLUEPRINT references them via Ref<X> ` +
          `(never duplicate); ADR = decisions; README = system intent. Then run dps_check to validate ` +
          `Ref<X>/single-definition/version-sync. code_search now fuses these spec files (source=spec).`,
      }],
      structuredContent: { specDir: specDir(root), ...res },
    };
  },
};

const dpsCheckTool: ToolDefinition = {
  name: "dps_check",
  description:
    "Validate the DPS spec in <workspace>/.dps/spec/ via the dps.py linter — checks that every Ref<X> in " +
    "BLUEPRINT resolves to CONTRACTS, single-definition rule, and version sync. Requires python3 (degrades to a " +
    "manual checklist otherwise). Note: spawns a process, so it is disabled under MCP_SAFE_MODE=true.",
  inputSchema: {
    mode: z.enum(["lint", "check"]).optional().describe("dps.py subcommand: 'lint' (cross-canonical, default) or 'check' (sidecar consistency)."),
    strict: z.boolean().optional().describe("For lint: require generated sidecars to exist."),
  },
  allowedPhases: ["intake", "execution", "review", "completed"],
  capabilities: ["fs.read", "process.spawn"],
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  execution: { taskSupport: "forbidden" },
  handler: async (args) => {
    const root = resolveWorkspaceRoot();
    if (!root) return noWorkspace();
    const { mode, strict } = args as { mode?: "lint" | "check"; strict?: boolean };

    const existing = await detectExistingSpec(root);
    if (!existing.length) return text(`[dps_check] No DPS spec at ${specDir(root)}. Run dps_init first.`);

    const r = await runDpsCheck(root, mode ?? "lint", Boolean(strict));
    if (!r.ran) {
      return text(`[dps_check] ${r.output}\n\n${MANUAL_FALLBACK}`);
    }
    return {
      content: [{ type: "text", text: `[dps_check] dps.py ${mode ?? "lint"}${strict ? " --strict" : ""} → ${r.ok ? "PASS" : "FINDINGS"}\n\n${r.output}` }],
      structuredContent: { ran: r.ran, ok: r.ok },
    };
  },
};

const dpsTools: ToolDefinition[] = [dpsInitTool, dpsCheckTool];

export default dpsTools;
