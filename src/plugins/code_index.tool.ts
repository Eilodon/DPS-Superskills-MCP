import { z } from "zod/v4";
import { ENV } from "../config/env.js";
import type { ToolDefinition } from "../mcp/adapter/tool_registry.js";
import {
  resolveWorkspaceRoot,
  buildIndex,
  searchIndex,
  indexStatus,
  ensureFreshIndex,
} from "../core/indexer/index.js";

/**
 * Data-plane local code retrieval (Tier-1, community).
 *
 * Native zero-dependency BM25 index over the user's source, living in
 * <workspace>/.dps/index/. Replaces blind grep+read with chunk-level retrieval
 * that returns path:line + a short preview — far fewer tokens per query.
 *
 * Locality: indexing needs a local filesystem workspace. resolveWorkspaceRoot()
 * returns null under HTTP transport without MCP_WORKSPACE_ROOT, and the tools
 * refuse — this is the data plane; the remote server stays the control plane.
 *
 * Capabilities: code_index writes only inside .dps/, so it declares the narrow
 * `fs.write.workspace` capability (deliberately NOT in the safe-mode denylist),
 * letting it run under MCP_SAFE_MODE=true.
 */

const NO_WORKSPACE_MSG =
  "[code_index] No local workspace available. The indexer is a data-plane feature " +
  "that requires local filesystem access. Run the server via stdio transport, or set " +
  "MCP_WORKSPACE_ROOT to the project root. (Remote/HTTP deployments are the control plane.)";

function noWorkspace() {
  return { content: [{ type: "text" as const, text: NO_WORKSPACE_MSG }] };
}

const codeSearchTool: ToolDefinition = {
  name: "code_search",
  description:
    "Semantic-ish local code search over the user's project (native BM25). " +
    "Use INSTEAD OF grep+read when locating where something is implemented — " +
    "returns the most relevant code chunks as path:line + preview, using far fewer " +
    "tokens than reading whole files. Auto-builds the index on first use if missing.",
  inputSchema: {
    query: z.string().min(1).describe("What to find, e.g. 'where is rate limiting enforced', 'jwt verification', 'BM25 scoring'."),
    top_k: z.number().int().min(1).max(30).optional().describe("Number of chunks to return (default 8)."),
    auto_index: z.boolean().optional().describe("If the index is missing/stale, build it first (default true)."),
  },
  allowedPhases: ["intake", "execution", "review", "completed"],
  capabilities: ["fs.read"],
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  execution: { taskSupport: "forbidden" },
  handler: async (args) => {
    const { query, top_k, auto_index } = args as { query: string; top_k?: number; auto_index?: boolean };
    const root = resolveWorkspaceRoot();
    if (!root) return noWorkspace();

    const autoIndex = auto_index !== false && ENV.MCP_INDEX_AUTO;
    // Auto-refresh when the index is missing OR stale (e.g. after dps_init
    // scaffolds spec, or files changed) — incremental, ~no-op cost when fresh.
    const fresh = await ensureFreshIndex(root, { auto: autoIndex });
    const consentNote = fresh.created
      ? `\n\n(Created a local index at ${root}/.dps/index/ — gitignored cache. Set MCP_INDEX_AUTO=false to disable auto-indexing.)`
      : "";
    const result = await searchIndex(root, query, top_k ?? 8);
    if (!result) {
      const why = autoIndex
        ? "Run code_index first."
        : "Auto-indexing is off (MCP_INDEX_AUTO=false or auto_index=false) — run code_index to build it explicitly.";
      return { content: [{ type: "text", text: `[code_search] No index. ${why}` }] };
    }
    if (result.hits.length === 0) {
      return { content: [{ type: "text", text: `[code_search] No matches for "${query}". Index has ${result.manifest.chunkCount} chunks across ${result.manifest.fileCount} files.${consentNote}` }] };
    }
    const body = result.hits.map((h, i) =>
      `#${i + 1}  [${h.source}]  ${h.path}:${h.startLine}-${h.endLine}${h.symbol ? `  (${h.symbol})` : ""}  score=${h.score}\n` +
      h.preview.split("\n").map(l => `    ${l}`).join("\n"),
    ).join("\n\n");
    return {
      content: [{ type: "text", text: `[code_search] ${result.hits.length} hit(s) for "${query}":\n\n${body}${consentNote}` }],
      structuredContent: { hits: result.hits, manifest: result.manifest },
    };
  },
};

const codeIndexTool: ToolDefinition = {
  name: "code_index",
  description:
    "Build or incrementally refresh the local code index in <workspace>/.dps/index/. " +
    "Only changed files (by size+mtime) are re-read. Run once per session or after large changes; " +
    "code_search auto-builds on first use, so explicit calls are mainly for warming/refresh.",
  inputSchema: {
    force: z.boolean().optional().describe("Rebuild from scratch, ignoring the previous index (default false)."),
  },
  allowedPhases: ["intake", "execution", "review", "completed"],
  capabilities: ["fs.read", "fs.write.workspace"],
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  execution: { taskSupport: "forbidden" },
  handler: async (args) => {
    const { force } = args as { force?: boolean };
    const root = resolveWorkspaceRoot();
    if (!root) return noWorkspace();
    const stats = await buildIndex(root, { force: Boolean(force) });
    return {
      content: [{
        type: "text",
        text: `[code_index] Indexed ${root}\n` +
          `  files=${stats.fileCount} chunks=${stats.chunkCount} ` +
          `(reindexed=${stats.reindexed}, reused=${stats.reused}) in ${stats.durationMs}ms\n` +
          `  rootHash=${stats.rootHash}`,
      }],
      structuredContent: stats,
    };
  },
};

const codeIndexStatusTool: ToolDefinition = {
  name: "code_index_status",
  description: "Report whether the local code index exists, its manifest, and how stale it is (added/modified/removed files).",
  inputSchema: {},
  allowedPhases: ["intake", "execution", "review", "completed"],
  capabilities: ["fs.read"],
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  execution: { taskSupport: "forbidden" },
  handler: async () => {
    const root = resolveWorkspaceRoot();
    if (!root) return noWorkspace();
    const status = await indexStatus(root);
    return {
      content: [{ type: "text", text: `[code_index_status]\n${JSON.stringify(status, null, 2)}` }],
      structuredContent: status,
    };
  },
};

const codeIndexTools: ToolDefinition[] = [codeSearchTool, codeIndexTool, codeIndexStatusTool];

export default codeIndexTools;
