/**
 * skills.tool.ts — DPS SuperSkills v5.2.1 MCP Plugin
 *
 * Exposes 3 MCP tools:
 *   1. skill_list    — enumerate all available skills + nano descriptions
 *   2. skill_read    — return full SKILL.md content for a given skill
 *   3. skill_run     — invoke a skill with caller-provided context, returns
 *                      structured workflow: checklist, output template, gotchas
 *
 * Registration: add "skills.tool.ts" to MCP_PLUGIN_ALLOWLIST in your .env
 */

import { z } from "zod/v4";
import { SKILL_REGISTRY, SKILL_MAP } from "../skills/skill_registry.js";
import { SkillLoader } from "../skills/skill_loader.js";
import { formatSkillResponse, formatSkillList } from "../skills/skill_executor.js";
import type { ToolDefinition } from "../mcp/adapter/tool_registry.js";

// Build Zod enum from the registry (must have at least 1 entry — guaranteed)
const SKILL_NAME_ENUM = [
  SKILL_REGISTRY[0].name,
  ...SKILL_REGISTRY.slice(1).map(s => s.name),
] as [string, ...string[]];

// ── Tool 1: skill_list ──────────────────────────────────────────────────────

const skillListTool: ToolDefinition = {
  name: "skill_list",
  description:
    "List all available DPS SuperSkills v5.2.1 skills with their descriptions and register " +
    "(DISCIPLINE / TECHNIQUE / KNOWLEDGE LAYER / REFERENCE). " +
    "Use this first to discover which skill to invoke.",
  inputSchema: {
    register: z
      .enum(["DISCIPLINE", "TECHNIQUE", "KNOWLEDGE LAYER", "REFERENCE"])
      .optional()
      .describe("Filter by register. Omit to list all skills."),
  },
  allowedPhases: ["intake", "execution", "review", "completed"],
  capabilities: ["fs.read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  execution: {
    taskSupport: "forbidden",
  },
  handler: async (args) => {
    const { register } = args as { register?: string };

    // Verify skills directory is accessible on first use
    await SkillLoader.assertAccessible();

    const filtered = register
      ? SKILL_REGISTRY.filter(s => s.register === register)
      : [...SKILL_REGISTRY];

    const text = formatSkillList(filtered);

    return {
      content: [{ type: "text", text }],
    };
  },
};

// ── Tool 2: skill_read ──────────────────────────────────────────────────────

const skillReadTool: ToolDefinition = {
  name: "skill_read",
  description:
    "Return the full SKILL.md content for a specific DPS SuperSkill. " +
    "Use when you need the raw, complete skill definition including all examples and pressure tests. " +
    "For a structured executable workflow, use skill_run instead.",
  inputSchema: {
    skill_name: z
      .enum(SKILL_NAME_ENUM)
      .describe("The skill slug to read (e.g. 'brainstorming', 'complexity-gate')."),
    include_nano: z
      .boolean()
      .optional()
      .describe("Also include the nano (compressed) version. Default: false."),
  },
  allowedPhases: ["intake", "execution", "review", "completed"],
  capabilities: ["fs.read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  execution: {
    taskSupport: "forbidden",
  },
  handler: async (args) => {
    const { skill_name, include_nano } = args as {
      skill_name: string;
      include_nano?: boolean;
    };

    const meta = SKILL_MAP.get(skill_name);
    if (!meta) {
      return {
        content: [{
          type: "text",
          text: `[skill_read] Unknown skill: "${skill_name}". Use skill_list to see available skills.`,
        }],
      };
    }

    const skill = await SkillLoader.load(skill_name);

    const parts: string[] = [
      `# ${skill.name} [${skill.register}]`,
      `\n${skill.fullContent}`,
    ];

    if (include_nano && skill.nanoContent) {
      parts.push(
        "\n---\n## Nano Reference\n",
        skill.nanoContent,
      );
    }

    return {
      content: [{ type: "text", text: parts.join("\n") }],
    };
  },
};

// ── Tool 3: skill_run ───────────────────────────────────────────────────────

const skillRunTool: ToolDefinition = {
  name: "skill_run",
  description:
    "Invoke a DPS SuperSkill v5.2.1 with your task context. " +
    "Returns a structured workflow response: ANNOUNCE statement, GOAL, CONSTRAINTS, " +
    "CHECKLIST (ready to execute), COMMANDS (bash/sh blocks extracted from the skill, " +
    "for you to run with your own shell tools), OUTPUT TEMPLATE (pre-labeled), active " +
    "GOTCHAS with do-instead guidance, and NANO REFERENCE. " +
    "\n\nTip: Run skill_list first if unsure which skill to use. " +
    "Run complexity-gate before other skills for software tasks.",
  inputSchema: {
    skill_name: z
      .enum(SKILL_NAME_ENUM)
      .describe(
        "The skill to invoke. Examples: 'complexity-gate', 'brainstorming', " +
        "'systematic-debugging', 'verification-before-completion'."
      ),
    task_description: z
      .string()
      .optional()
      .describe(
        "What you are working on. Be specific: include the feature name, file, " +
        "component, or error message relevant to this skill invocation."
      ),
    context: z
      .string()
      .optional()
      .describe(
        "Additional project context: tech stack, team size, existing constraints, " +
        "or relevant file paths."
      ),
    error_message: z
      .string()
      .optional()
      .describe(
        "For debugging skills: the exact error text, stack trace excerpt, or " +
        "unexpected behavior description."
      ),
    query: z
      .string()
      .optional()
      .describe(
        "For kb-query: the search term (topic, decision, module name) to look up."
      ),
    mode: z
      .string()
      .optional()
      .describe(
        "Optional mode hint passed to the skill (e.g. 'C3' for complexity-gate, " +
        "'STRIDE' for specialist-review, 'SOLO' for session-handoff)."
      ),
  },
  allowedPhases: ["intake", "execution", "review", "completed"],
  capabilities: ["fs.read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  execution: {
    taskSupport: "forbidden",
  },
  handler: async (args) => {
    const {
      skill_name,
      task_description,
      context,
      error_message,
      query,
      mode,
    } = args as {
      skill_name: string;
      task_description?: string;
      context?: string;
      error_message?: string;
      query?: string;
      mode?: string;
    };

    const meta = SKILL_MAP.get(skill_name);
    if (!meta) {
      return {
        content: [{
          type: "text",
          text: `[skill_run] Unknown skill: "${skill_name}". Use skill_list to see available skills.`,
        }],
      };
    }

    let skill;
    try {
      skill = await SkillLoader.load(skill_name);
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `[skill_run] Failed to load skill "${skill_name}": ${err instanceof Error ? err.message : String(err)}`,
        }],
      };
    }

    const text = formatSkillResponse(skill, {
      skill_name,
      task_description,
      context,
      error_message,
      query,
      mode,
    });

    return {
      content: [{ type: "text", text }],
    };
  },
};

// ── Export ──────────────────────────────────────────────────────────────────

const skillsTools: ToolDefinition[] = [
  skillListTool,
  skillReadTool,
  skillRunTool,
];

export default skillsTools;
