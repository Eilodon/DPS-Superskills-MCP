/**
 * skill_dispatch.test.ts — coverage for the skill_dispatch tool: tier routing,
 * role validation, C0 graceful path, and skill_run format=json structuredContent.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import skillsTools from "../plugins/skills.tool.js";

const skillDispatch = skillsTools.find(t => t.name === "skill_dispatch")!;
const skillRun = skillsTools.find(t => t.name === "skill_run")!;
const skillList = skillsTools.find(t => t.name === "skill_list")!;

async function runHandler(tool: typeof skillDispatch, args: Record<string, unknown>) {
  const schema = z.object(tool.inputSchema as Record<string, z.ZodTypeAny>);
  const parsed = schema.parse(args);
  return tool.handler(parsed, {} as never);
}

describe("skill_dispatch", () => {
  it("C0 returns a simplified prompt without empty sections", async () => {
    const result: any = await runHandler(skillDispatch, {
      task_description: "Rename a single utility function",
      complexity_tier: "C0",
      role: "implementer",
    });
    const text = result.content[0].text as string;
    expect(text).toContain("# ROLE: Implementer");
    expect(text).toContain("C0 task");
    expect(text).not.toContain("Required Skills (invoke via skill_run");
    expect(text).not.toContain("Skill Nano References");
  });

  it("C0 includes additional_constraints when provided", async () => {
    const result: any = await runHandler(skillDispatch, {
      task_description: "Tweak a comment",
      complexity_tier: "C0",
      role: "implementer",
      additional_constraints: "do not touch authentication code",
    });
    expect(result.content[0].text).toContain("do not touch authentication code");
  });

  it("rejects roles not applicable to the tier", async () => {
    const result: any = await runHandler(skillDispatch, {
      task_description: "task",
      complexity_tier: "C0",
      role: "reviewer",
    });
    expect(result.content[0].text).toContain("not applicable for C0");
  });

  it("C3 returns implementer prompt with full skill list and nano refs", async () => {
    const result: any = await runHandler(skillDispatch, {
      task_description: "Migrate auth flow",
      complexity_tier: "C3",
      role: "implementer",
    });
    const text = result.content[0].text as string;
    expect(text).toContain("# ROLE: Implementer");
    expect(text).toContain("tdd-verified");
    expect(text).toContain("Skill Nano References");
    expect(text).toContain("brainstorming");
  });

  it("C3 accepts additional_skills if valid", async () => {
    const result: any = await runHandler(skillDispatch, {
      task_description: "task",
      complexity_tier: "C3",
      role: "implementer",
      additional_skills: "context-reanchor,systematic-debugging",
    });
    const text = result.content[0].text as string;
    expect(text).toContain("context-reanchor");
    expect(text).toContain("systematic-debugging");
  });
});

describe("skill_run format=json", () => {
  it("returns structuredContent with parsed sections when format=json", async () => {
    const result: any = await runHandler(skillRun, {
      skill_name: "complexity-gate",
      format: "json",
      depth: "nano",
    });
    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent.skill.name).toBeTruthy();
    expect(result.structuredContent.depth).toBe("nano");
    expect(Array.isArray(result.structuredContent.gotchas)).toBe(true);
    expect(Array.isArray(result.structuredContent.suggestedNext)).toBe(true);
  });

  it("omits structuredContent when format is text (default)", async () => {
    const result: any = await runHandler(skillRun, {
      skill_name: "complexity-gate",
      depth: "nano",
    });
    expect(result.structuredContent).toBeUndefined();
  });
});

describe("skill_list routing hints", () => {
  it("renders suggested-next hints for skills that have routing entries", async () => {
    const result: any = await runHandler(skillList, {});
    const text = result.content[0].text as string;
    expect(text).toContain("→ suggested next:");
    expect(text).toContain("Routing hints");
  });
});
