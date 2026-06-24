/**
 * skills.tool.ts — DPS SuperSkills v5.2.1 MCP Plugin
 *
 * Exposes 4 MCP tools:
 *   1. skill_list     — enumerate all available skills + nano descriptions
 *   2. skill_read     — return full SKILL.md content for a given skill
 *   3. skill_run      — invoke a skill with caller-provided context, returns
 *                       structured workflow: checklist, output template, gotchas
 *   4. skill_dispatch — generate a prompt template for subagent dispatch
 *
 * Registration: add "skills.tool.ts" to MCP_PLUGIN_ALLOWLIST in your .env
 */

import { z } from "zod/v4";
import { SKILL_REGISTRY, SKILL_MAP } from "../skills/skill_registry.js";
import { SkillLoader } from "../skills/skill_loader.js";
import { formatSkillResponse, formatSkillList, loadProjectContext, suggestedNextSkills } from "../skills/skill_executor.js";
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
    "Returns a structured workflow response scaled by depth parameter: " +
    "'nano' (~200 tokens) for quick routing, " +
    "'checklist' (~800 tokens) for execution, " +
    "'full' (default, ~2000+ tokens) for first-time reading. " +
    "\n\nTip: Use depth='nano' when routing through complexity-gate. " +
    "Use depth='checklist' when you already know the skill and need the actionable steps. " +
    "Run skill_list first if unsure which skill to use.",
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
    depth: z
      .enum(["nano", "checklist", "full"])
      .optional()
      .describe(
        "Response detail level. " +
        "'nano': goal + compressed reference + gotchas (~200 tokens, for discovery/routing). " +
        "'checklist': announce + goal + constraints + checklist + commands + gotchas (~800 tokens, for execution). " +
        "'full': everything including output template + nano reference (~2000+ tokens, for first-time reading). " +
        "Default: 'full'."
      ),
    format: z
      .enum(["text", "json"])
      .optional()
      .describe(
        "Response format. " +
        "'text' (default): human-readable workflow text. " +
        "'json': structuredContent with parsed sections (skill metadata, checklist, gotchas, commands, projectContext) for agent-to-agent dispatch."
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
      depth,
      format,
    } = args as {
      skill_name: string;
      task_description?: string;
      context?: string;
      error_message?: string;
      query?: string;
      mode?: string;
      depth?: "nano" | "checklist" | "full";
      format?: "text" | "json";
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

    const projectCtx = depth !== "nano" ? await loadProjectContext() : undefined;

    const text = formatSkillResponse(skill, {
      skill_name,
      task_description,
      context,
      error_message,
      query,
      mode,
      depth,
    }, projectCtx);

    if (format === "json") {
      const structuredContent = {
        skill: {
          name: skill.name,
          register: skill.register,
          goal: skill.goal,
          announce: skill.announce,
          constraints: skill.constraints,
        },
        depth: depth ?? "full",
        checklist: skill.checklist,
        commands: skill.commands,
        gotchas: skill.gotchas
          .filter(g => g.status === "ACTIVE")
          .map(g => ({ claim: g.claim, doInstead: g.doInstead })),
        outputTemplate: skill.outputTemplate || null,
        nano: skill.nanoContent || null,
        projectContext: projectCtx ?? null,
        suggestedNext: suggestedNextSkills(skill_name),
      };
      return {
        content: [{ type: "text", text }],
        structuredContent,
      };
    }

    return {
      content: [{ type: "text", text }],
    };
  },
};

// ── Tool 4: skill_dispatch ──────────────────────────────────────────────────

interface TierConfig {
  skills: string[];
  roles: string[];
  specTier: string;
}

const TIER_CONFIGS: Record<string, TierConfig> = {
  C0: {
    skills: [],
    roles: ["implementer"],
    specTier: "none",
  },
  C1: {
    skills: ["tdd-verified", "verification-before-completion", "pattern-globalize"],
    roles: ["implementer"],
    specTier: "inline",
  },
  C2: {
    skills: ["brainstorming", "tdd-verified", "writing-plans", "verification-before-completion", "pattern-globalize"],
    roles: ["implementer", "reviewer"],
    specTier: "lightweight",
  },
  C3: {
    skills: ["domain-alignment", "brainstorming", "audit-design", "writing-plans", "task-risk-score", "specialist-review", "tdd-verified", "verification-before-completion", "adr-commit", "knowledge-compound"],
    roles: ["implementer", "reviewer", "specialist"],
    specTier: "standard",
  },
  C4: {
    skills: ["domain-alignment", "brainstorming", "audit-design", "writing-plans", "task-risk-score", "specialist-review", "tdd-verified", "verification-before-completion", "adr-commit", "knowledge-compound", "privacy-secrets-gate", "release-readiness"],
    roles: ["implementer", "reviewer", "specialist"],
    specTier: "full",
  },
};

const ROLE_TEMPLATES: Record<string, (ctx: { task: string; skills: string; constraints: string }) => string> = {
  implementer: (ctx) => [
    `# ROLE: Implementer`,
    ``,
    `## Task`,
    ctx.task,
    ``,
    `## Required Skills (invoke via skill_run with depth="checklist")`,
    ctx.skills,
    ``,
    `## Constraints`,
    ctx.constraints,
    `- Write code that passes all existing tests`,
    `- Follow TDD: failing test first, then minimal implementation`,
    `- Document every Fix Anchor (file:line — description)`,
    `- Do NOT claim completion without T1/T2 evidence`,
    ``,
    `## Completion Criteria`,
    `- All tests pass (fresh run, not cached)`,
    `- Fix Anchors documented for every bug fix`,
    `- pattern-globalize run for every confirmed bug`,
    `- verification-before-completion checklist completed`,
  ].join("\n"),

  reviewer: (ctx) => [
    `# ROLE: Reviewer`,
    ``,
    `## Task`,
    `Review the implementation for: ${ctx.task}`,
    ``,
    `## Review Skills (invoke via skill_run with depth="checklist")`,
    ctx.skills,
    ``,
    `## Review Checklist`,
    `- [ ] Code correctness: does it solve the stated problem?`,
    `- [ ] Test coverage: are edge cases tested?`,
    `- [ ] Evidence: are Fix Anchors present for bug fixes?`,
    `- [ ] Pattern check: has pattern-globalize been run?`,
    `- [ ] No unverified completion claims (T4 → reject)`,
    `- [ ] No hedge language ("should work", "probably fine")`,
    ``,
    `## Output Format`,
    `REVIEW RESULT: PASS | CHANGES_REQUESTED | HOLD`,
    `Findings: [list specific items]`,
    `Evidence gaps: [list missing evidence]`,
  ].join("\n"),

  specialist: (ctx) => [
    `# ROLE: Specialist Reviewer`,
    ``,
    `## Task`,
    `Specialist review for: ${ctx.task}`,
    ``,
    `## Required Lenses (invoke specialist-review with mode parameter)`,
    ctx.skills,
    ``,
    `## Constraints`,
    ctx.constraints,
    `- Apply each specialist lens independently`,
    `- Flag risks with severity (HIGH/MEDIUM/LOW) and evidence tier`,
    `- Recommend mitigations, not just findings`,
    ``,
    `## Output Format`,
    `SPECIALIST REVIEW: [lens name]`,
    `Risk level: HIGH | MEDIUM | LOW`,
    `Findings: [specific items with file:line references]`,
    `Mitigations: [concrete actions]`,
  ].join("\n"),
};

const skillDispatchTool: ToolDefinition = {
  name: "skill_dispatch",
  description:
    "Generate a structured prompt template for dispatching a subagent with the right DPS skills preloaded. " +
    "Use after complexity-gate to create role-specific prompts (implementer, reviewer, specialist) " +
    "that your agent framework can use to spawn focused subagents. " +
    "Returns a ready-to-use prompt with task context, required skills, constraints, and completion criteria.",
  inputSchema: {
    task_description: z
      .string()
      .describe("What the subagent should accomplish. Be specific."),
    complexity_tier: z
      .enum(["C0", "C1", "C2", "C3", "C4"])
      .describe("The complexity tier from complexity-gate scoring."),
    role: z
      .enum(["implementer", "reviewer", "specialist"])
      .describe(
        "The role for the subagent. " +
        "'implementer': writes code with TDD discipline. " +
        "'reviewer': reviews implementation for correctness and evidence. " +
        "'specialist': applies specialist lenses (STRIDE, OWASP, etc.)."
      ),
    additional_skills: z
      .string()
      .optional()
      .describe("Comma-separated additional skill names to include beyond the tier defaults."),
    additional_constraints: z
      .string()
      .optional()
      .describe("Extra constraints specific to this dispatch (e.g., 'do not modify auth module')."),
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
      task_description,
      complexity_tier,
      role,
      additional_skills,
      additional_constraints,
    } = args as {
      task_description: string;
      complexity_tier: string;
      role: string;
      additional_skills?: string;
      additional_constraints?: string;
    };

    const config = TIER_CONFIGS[complexity_tier];
    if (!config) {
      return {
        content: [{ type: "text", text: `[skill_dispatch] Unknown tier: ${complexity_tier}` }],
      };
    }

    if (!config.roles.includes(role)) {
      return {
        content: [{
          type: "text",
          text: `[skill_dispatch] Role "${role}" not applicable for ${complexity_tier}. Available roles: ${config.roles.join(", ")}.`,
        }],
      };
    }

    let skills = [...config.skills];
    if (additional_skills) {
      const extras = additional_skills.split(",").map(s => s.trim()).filter(Boolean);
      for (const extra of extras) {
        if (SKILL_MAP.has(extra) && !skills.includes(extra)) {
          skills.push(extra);
        }
      }
    }

    if (complexity_tier === "C0" && skills.length === 0) {
      const c0Prompt = [
        `# ROLE: Implementer`,
        ``,
        `## Task`,
        task_description,
        ``,
        `## Notes`,
        `This is a C0 task — no DPS skills required. Implement directly.`,
        `- Keep the change small and focused.`,
        `- Run the existing tests to confirm nothing regressed.`,
        additional_constraints ? `- ${additional_constraints}` : "",
      ].filter(Boolean).join("\n");

      return {
        content: [{ type: "text", text: c0Prompt }],
      };
    }

    const nanoRefs: string[] = [];
    for (const skillName of skills) {
      const nano = await SkillLoader.loadNano(skillName);
      if (nano) {
        nanoRefs.push(`### ${skillName}\n${nano.trim()}`);
      } else {
        nanoRefs.push(`### ${skillName}\n(Use skill_run("${skillName}", depth="checklist") for full workflow)`);
      }
    }

    const constraints = [
      `- Complexity tier: ${complexity_tier} (spec tier: ${config.specTier})`,
      `- Evidence discipline: T1/T2 required. T4 claims are NEVER evidence.`,
      `- Output firewall active: hedge language and unverified completion claims will be flagged.`,
    ];
    if (additional_constraints) {
      constraints.push(`- ${additional_constraints}`);
    }

    const templateFn = ROLE_TEMPLATES[role];
    if (!templateFn) {
      return {
        content: [{ type: "text", text: `[skill_dispatch] Unknown role: ${role}` }],
      };
    }

    const prompt = templateFn({
      task: task_description,
      skills: skills.map(s => `- ${s}`).join("\n"),
      constraints: constraints.join("\n"),
    });

    const sections = [
      prompt,
      "",
      "---",
      "",
      "## Skill Nano References (preloaded context)",
      "",
      ...nanoRefs,
    ];

    return {
      content: [{ type: "text", text: sections.join("\n") }],
    };
  },
};

// ── Export ──────────────────────────────────────────────────────────────────

const skillsTools: ToolDefinition[] = [
  skillListTool,
  skillReadTool,
  skillRunTool,
  skillDispatchTool,
];

export default skillsTools;
