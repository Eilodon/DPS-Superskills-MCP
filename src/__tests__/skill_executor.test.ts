/**
 * skill_executor.test.ts — Unit tests for formatSkillResponse / formatSkillList.
 *
 * Focus: the COMMANDS section is new this session (surfaces the bash/sh blocks
 * SkillLoader extracts from a skill's markdown body, so an IDE-agent caller with
 * its own shell tools can see and run them) — verify it renders correctly and
 * stays gated on non-empty, same as the other optional sections.
 */

import { describe, it, expect } from "vitest";
import { formatSkillResponse, formatSkillList } from "../skills/skill_executor.js";
import type { ParsedSkill } from "../skills/skill_loader.js";

function baseSkill(overrides: Partial<ParsedSkill> = {}): ParsedSkill {
  return {
    name: "test-skill",
    description: "A test skill",
    register: "TECHNIQUE",
    goal: "",
    constraints: [],
    announce: "",
    checklist: [],
    outputTemplate: "",
    commands: [],
    gotchas: [],
    nanoContent: "",
    fullContent: "",
    ...overrides,
  };
}

describe("formatSkillResponse — COMMANDS section", () => {
  it("renders extracted commands as numbered, indented blocks with a review caveat", () => {
    const skill = baseSkill({ commands: ["echo one", "echo two\necho three"] });
    const text = formatSkillResponse(skill, { skill_name: "test-skill" });

    expect(text).toContain("COMMANDS (2 extracted bash/sh block(s) — review before running, some are conditional or destructive):");
    expect(text).toContain("  --- [1] ---\n  echo one");
    expect(text).toContain("  --- [2] ---\n  echo two\n  echo three");
  });

  it("omits the COMMANDS section entirely when there are no extracted commands", () => {
    const skill = baseSkill({ commands: [] });
    const text = formatSkillResponse(skill, { skill_name: "test-skill" });
    expect(text).not.toContain("COMMANDS");
  });

  it("places COMMANDS after CHECKLIST and before OUTPUT TEMPLATE", () => {
    const skill = baseSkill({
      checklist: ["do the thing"],
      commands: ["echo hi"],
      outputTemplate: "STATUS: done",
    });
    const text = formatSkillResponse(skill, { skill_name: "test-skill" });
    const checklistIdx = text.indexOf("CHECKLIST");
    const commandsIdx = text.indexOf("COMMANDS");
    const outputIdx = text.indexOf("OUTPUT TEMPLATE");
    expect(checklistIdx).toBeGreaterThan(-1);
    expect(commandsIdx).toBeGreaterThan(checklistIdx);
    expect(outputIdx).toBeGreaterThan(commandsIdx);
  });
});

describe("formatSkillResponse — existing sections (no regressions)", () => {
  it("renders header, announce, goal, and constraints", () => {
    const skill = baseSkill({
      announce: "Running test-skill",
      goal: "Verify behavior",
      constraints: ["No shortcuts", "Evidence required"],
    });
    const text = formatSkillResponse(skill, { skill_name: "test-skill" });
    expect(text).toContain("SKILL: TEST-SKILL  [TECHNIQUE]  depth=full");
    expect(text).toContain("ANNOUNCE: Running test-skill");
    expect(text).toContain("GOAL: Verify behavior");
    expect(text).toContain("  • No shortcuts");
    expect(text).toContain("  • Evidence required");
  });

  it("renders caller-provided context fields", () => {
    const skill = baseSkill();
    const text = formatSkillResponse(skill, {
      skill_name: "test-skill",
      task_description: "Fix the bug",
      error_message: "TypeError: x is undefined",
    });
    expect(text).toContain("Task: Fix the bug");
    expect(text).toContain("Error: TypeError: x is undefined");
  });

  it("renders the checklist as a numbered, unchecked list", () => {
    const skill = baseSkill({ checklist: ["Write a failing test", "Make it pass"] });
    const text = formatSkillResponse(skill, { skill_name: "test-skill" });
    expect(text).toContain("  [ ] 1. Write a failing test");
    expect(text).toContain("  [ ] 2. Make it pass");
  });

  it("renders only ACTIVE gotchas, with do-instead guidance when present", () => {
    const skill = baseSkill({
      gotchas: [
        { claim: "Assumed X", doInstead: "Check Y first", status: "ACTIVE" },
        { claim: "Old resolved issue", doInstead: "", status: "RESOLVED" },
      ],
    });
    const text = formatSkillResponse(skill, { skill_name: "test-skill" });
    expect(text).toContain("GOTCHAS (1 active — read before proceeding):");
    expect(text).toContain("Assumed X");
    expect(text).toContain("DO INSTEAD: Check Y first");
    expect(text).not.toContain("Old resolved issue");
  });

  it("omits optional sections entirely when empty", () => {
    const text = formatSkillResponse(baseSkill(), { skill_name: "test-skill" });
    expect(text).not.toContain("ANNOUNCE");
    expect(text).not.toContain("GOAL");
    expect(text).not.toContain("CONSTRAINTS");
    expect(text).not.toContain("CHECKLIST");
    expect(text).not.toContain("COMMANDS");
    expect(text).not.toContain("OUTPUT TEMPLATE");
    expect(text).not.toContain("GOTCHAS");
    expect(text).not.toContain("NANO REFERENCE");
  });
});

describe("formatSkillResponse — enforcement gates", () => {
  it("includes enforcement gates for DISCIPLINE register skills", () => {
    const skill = baseSkill({ register: "DISCIPLINE", name: "tdd-verified" });
    const text = formatSkillResponse(skill, { skill_name: "tdd-verified" });
    expect(text).toContain("ENFORCEMENT GATES");
    expect(text).toContain("proof_mode_declared");
    expect(text).toContain("failing_test_evidence");
  });

  it("includes pattern-globalize enforcement gate", () => {
    const skill = baseSkill({ name: "pattern-globalize" });
    const text = formatSkillResponse(skill, { skill_name: "pattern-globalize" });
    expect(text).toContain("grep_executed");
  });

  it("omits enforcement gates for skills without specific gates", () => {
    const skill = baseSkill({ name: "brainstorming", register: "TECHNIQUE" });
    const text = formatSkillResponse(skill, { skill_name: "brainstorming" });
    expect(text).not.toContain("ENFORCEMENT GATES");
  });
});

describe("formatSkillResponse — depth parameter", () => {
  const fullSkill = baseSkill({
    announce: "Running test-skill",
    goal: "Verify behavior",
    constraints: ["No shortcuts", "Evidence required"],
    checklist: ["Write a failing test", "Make it pass"],
    commands: ["echo hi"],
    outputTemplate: "STATUS: done",
    nanoContent: "Compressed reference here",
    gotchas: [
      { claim: "Watch out for X", doInstead: "Do Y instead", status: "ACTIVE" },
    ],
  });

  it("depth='nano' includes goal, nano reference, and gotcha claims but omits checklist/commands/output/announce", () => {
    const text = formatSkillResponse(fullSkill, { skill_name: "test-skill", depth: "nano" });
    expect(text).toContain("depth=nano");
    expect(text).toContain("GOAL: Verify behavior");
    expect(text).toContain("NANO REFERENCE:");
    expect(text).toContain("Compressed reference here");
    expect(text).toContain("Watch out for X");
    expect(text).not.toContain("ANNOUNCE:");
    expect(text).not.toContain("CHECKLIST");
    expect(text).not.toContain("COMMANDS");
    expect(text).not.toContain("OUTPUT TEMPLATE");
    expect(text).not.toContain("DO INSTEAD");
  });

  it("depth='checklist' includes announce, goal, constraints, checklist, commands, gotchas with DO INSTEAD but omits output template and nano", () => {
    const text = formatSkillResponse(fullSkill, { skill_name: "test-skill", depth: "checklist" });
    expect(text).toContain("depth=checklist");
    expect(text).toContain("ANNOUNCE: Running test-skill");
    expect(text).toContain("GOAL: Verify behavior");
    expect(text).toContain("CONSTRAINTS:");
    expect(text).toContain("CHECKLIST");
    expect(text).toContain("COMMANDS");
    expect(text).toContain("DO INSTEAD: Do Y instead");
    expect(text).not.toContain("OUTPUT TEMPLATE");
    expect(text).not.toContain("NANO REFERENCE");
  });

  it("depth='full' includes everything (default behavior)", () => {
    const text = formatSkillResponse(fullSkill, { skill_name: "test-skill", depth: "full" });
    expect(text).toContain("depth=full");
    expect(text).toContain("ANNOUNCE:");
    expect(text).toContain("GOAL:");
    expect(text).toContain("CHECKLIST");
    expect(text).toContain("COMMANDS");
    expect(text).toContain("OUTPUT TEMPLATE");
    expect(text).toContain("NANO REFERENCE");
    expect(text).toContain("DO INSTEAD");
  });

  it("defaults to full depth when depth is omitted", () => {
    const text = formatSkillResponse(fullSkill, { skill_name: "test-skill" });
    expect(text).toContain("depth=full");
    expect(text).toContain("OUTPUT TEMPLATE");
    expect(text).toContain("NANO REFERENCE");
  });

  it("depth='nano' shows fallback message when no nano content exists", () => {
    const noNano = baseSkill({ goal: "Test goal" });
    const text = formatSkillResponse(noNano, { skill_name: "test-skill", depth: "nano" });
    expect(text).toContain('Use depth="checklist" or depth="full" for details');
  });

  it("depth='nano' still passes through caller context", () => {
    const text = formatSkillResponse(fullSkill, {
      skill_name: "test-skill",
      depth: "nano",
      task_description: "Fix the auth bug",
    });
    expect(text).toContain("Task: Fix the auth bug");
  });
});

describe("formatSkillList", () => {
  it("groups skills by register and includes a total count", () => {
    const text = formatSkillList([
      { name: "complexity-gate", description: "Classifies complexity", register: "DISCIPLINE" },
      { name: "brainstorming", description: "Explores intent", register: "TECHNIQUE" },
    ]);
    expect(text).toContain("[DISCIPLINE]");
    expect(text).toContain("complexity-gate");
    expect(text).toContain("[TECHNIQUE]");
    expect(text).toContain("brainstorming");
    expect(text).toContain("Total: 2 skills");
  });
});
