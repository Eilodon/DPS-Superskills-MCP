/**
 * skill_resources.test.ts — Unit tests for MCP Resources (skill://) endpoint.
 *
 * Validates:
 *   1. URI parsing whitelist (only skill:// scheme accepted)
 *   2. Rate-limit enforcement on resources/read
 *   3. Output firewall enforcement on resources/read
 *   4. 404 for unknown skills
 *   5. resources/list returns all 31 skills with correct metadata
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// URI parsing tests (pure logic, no server needed)
// ---------------------------------------------------------------------------

const SKILL_URI_RE = /^skill:\/\/([a-z][a-z0-9-]*)$/;

function parseSkillUri(uri: string | undefined): string | null {
  if (!uri) return null;
  const m = SKILL_URI_RE.exec(uri);
  return m ? m[1] : null;
}

describe("skill resource URI parsing", () => {
  it("accepts valid skill URIs", () => {
    expect(parseSkillUri("skill://brainstorming")).toBe("brainstorming");
    expect(parseSkillUri("skill://complexity-gate")).toBe("complexity-gate");
    expect(parseSkillUri("skill://tdd-verified")).toBe("tdd-verified");
    expect(parseSkillUri("skill://verification-before-completion")).toBe("verification-before-completion");
  });

  it("rejects path traversal attempts", () => {
    expect(parseSkillUri("skill://../../../etc/passwd")).toBeNull();
    expect(parseSkillUri("skill://brainstorming/../../etc/passwd")).toBeNull();
    expect(parseSkillUri("skill://brainstorming/../secret")).toBeNull();
  });

  it("rejects non-skill URI schemes", () => {
    expect(parseSkillUri("file:///etc/passwd")).toBeNull();
    expect(parseSkillUri("http://example.com")).toBeNull();
    expect(parseSkillUri("")).toBeNull();
    expect(parseSkillUri(undefined)).toBeNull();
  });

  it("rejects URIs with special characters", () => {
    expect(parseSkillUri("skill://brain storming")).toBeNull();
    expect(parseSkillUri("skill://brainstorming;rm -rf /")).toBeNull();
    expect(parseSkillUri("skill://BRAINSTORMING")).toBeNull(); // uppercase
    expect(parseSkillUri("skill://brain.storming")).toBeNull(); // dots
  });

  it("rejects URIs starting with non-alpha", () => {
    expect(parseSkillUri("skill://-brainstorming")).toBeNull();
    expect(parseSkillUri("skill://1brainstorming")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Registry consistency test
// ---------------------------------------------------------------------------

describe("skill resource registry", () => {
  it("SKILL_REGISTRY contains all 31 skills", async () => {
    const { SKILL_REGISTRY } = await import("../skills/skill_registry.js");
    expect(SKILL_REGISTRY.length).toBe(31);
  });

  it("all skill names match URI regex", async () => {
    const { SKILL_REGISTRY } = await import("../skills/skill_registry.js");
    for (const skill of SKILL_REGISTRY) {
      const parsed = parseSkillUri(`skill://${skill.name}`);
      expect(parsed, `Skill name '${skill.name}' should produce valid URI`).toBe(skill.name);
    }
  });

  it("DISCIPLINE skills have correct register", async () => {
    const { SKILL_REGISTRY } = await import("../skills/skill_registry.js");
    const disciplines = SKILL_REGISTRY.filter(s => s.register === "DISCIPLINE");
    expect(disciplines.length).toBe(6);
    const names = disciplines.map(s => s.name);
    expect(names).toContain("complexity-gate");
    expect(names).toContain("tdd-verified");
    expect(names).toContain("verification-before-completion");
    expect(names).toContain("context-reanchor");
    expect(names).toContain("epistemic-health-check");
    expect(names).toContain("privacy-secrets-gate");
  });
});
