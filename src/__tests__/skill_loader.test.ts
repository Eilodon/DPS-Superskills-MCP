/**
 * skill_loader.test.ts — Unit tests for the SKILL.md markdown-to-structured-data bridge.
 *
 * Covers the parsing helpers in src/skills/skill_loader.ts:
 *   - parseFrontmatter / extractInlineField (Register/Goal/Constraints/Announce)
 *   - extractSection (fence-aware heading-bounded section extraction)
 *   - extractChecklist (named section, or "## Step N:" heading fallback)
 *   - extractCommands (fenced bash/sh block extraction)
 *   - extractGotchas (YAML-ish + legacy one-liner styles)
 *   - extractOutput (heading-alias resolution)
 *
 * Plus a handful of integration-style regression locks against the real
 * docs/DPS-superskills-v5.2.1 corpus, anchored to the two concrete bugs this
 * suite was written to prevent from recurring:
 *   1. Register silently empty for skills with no inline "**Register:**" line.
 *   2. extractSection truncating early on a literal "## " line inside a
 *      fenced code block (session-handoff's embedded handoff-document template).
 */

import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  extractInlineField,
  extractSection,
  extractChecklist,
  extractCommands,
  extractGotchas,
  extractOutput,
  SkillLoader,
} from "../skills/skill_loader.js";
import { SKILL_NAMES } from "../skills/skill_registry.js";

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe("parseFrontmatter", () => {
  it("parses key: value pairs from YAML frontmatter", () => {
    const content = `---\nname: my-skill\ndescription: "Does a thing"\n---\n\nBody text`;
    expect(parseFrontmatter(content)).toEqual({
      name: "my-skill",
      description: "Does a thing",
    });
  });

  it("returns empty object when no frontmatter block exists", () => {
    expect(parseFrontmatter("# Just a heading\n\nBody text")).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// extractInlineField
// ---------------------------------------------------------------------------

describe("extractInlineField", () => {
  it("extracts a value embedded inside the bold span: **Field: value**", () => {
    const content = "**Register: DISCIPLINE** — runs before any other skill";
    expect(extractInlineField(content, "Register")).toBe("DISCIPLINE");
  });

  it("extracts a value following the bold span: **Field:** value", () => {
    const content = "**Goal:** Ship the feature without regressions.";
    expect(extractInlineField(content, "Goal")).toBe("Ship the feature without regressions");
  });

  it("returns empty string when the field is absent", () => {
    expect(extractInlineField("no fields here", "Register")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// extractSection — fence awareness (the core regression target)
// ---------------------------------------------------------------------------

describe("extractSection", () => {
  it("extracts content between a heading and the next heading", () => {
    const content = [
      "## Checklist",
      "- [ ] one",
      "- [ ] two",
      "## Output",
      "done",
    ].join("\n");
    expect(extractSection(content, "Checklist")).toBe("- [ ] one\n- [ ] two");
  });

  it("does not let a literal '## ' line inside a fenced block end the section early", () => {
    // Mirrors session-handoff/SKILL.md: a "## The Handoff Document" section
    // whose body is a ```markdown template containing literal inner headings
    // like "## Task Summary" that are NOT real document structure.
    const content = [
      "## The Handoff Document",
      "",
      "```markdown",
      "## Task Summary",
      "[1-2 sentences]",
      "## Skills in Use",
      "- [skill]: why",
      "```",
      "",
      "## Nano Mode Handoff",
      "compressed form",
    ].join("\n");

    const section = extractSection(content, "The Handoff Document");
    expect(section).toContain("## Task Summary");
    expect(section).toContain("## Skills in Use");
    expect(section).not.toContain("Nano Mode Handoff");
  });

  it("treats an indented fence (nested under a bullet) as a fence boundary too", () => {
    // Mirrors adr-commit/SKILL.md Step 6: a top-level (unindented) section
    // containing a fenced block that is itself indented under a "- " bullet.
    const content = [
      "## Cleanup Workspace",
      "- Path under worktrees/ → we own it:",
      "  ```bash",
      "  ## not a real heading, just example output",
      "  git worktree remove foo",
      "  ```",
      "- Otherwise → do not remove",
      "## Quick Reference",
      "other content",
    ].join("\n");

    const section = extractSection(content, "Cleanup Workspace");
    expect(section).toContain("## not a real heading, just example output");
    expect(section).toContain("Otherwise");
    expect(section).not.toContain("Quick Reference");
  });

  it("matches heading names case-insensitively", () => {
    const content = "## checklist\nitem one\n";
    expect(extractSection(content, "Checklist")).toBe("item one");
  });

  it("returns empty string when the heading does not exist", () => {
    expect(extractSection("## Other\ntext", "Checklist")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// extractChecklist
// ---------------------------------------------------------------------------

describe("extractChecklist", () => {
  it("extracts bullet items from a named Checklist section", () => {
    const content = [
      "## Checklist",
      "- [ ] Write a failing test",
      "- [ ] Make it pass",
      "## Output",
    ].join("\n");
    expect(extractChecklist(content)).toEqual([
      "Write a failing test",
      "Make it pass",
    ]);
  });

  it("falls back to '## Step N: <title>' headings when no named section exists", () => {
    const content = [
      "## Step 1: Verify Tests",
      "body",
      "## Step 2: Detect Environment",
      "body",
      "## Step 3.5: ADR Gate",
      "body",
    ].join("\n");
    expect(extractChecklist(content)).toEqual([
      "Step 1: Verify Tests",
      "Step 2: Detect Environment",
      "Step 3.5: ADR Gate",
    ]);
  });

  it("ignores bare-numbered template headings that don't say 'Step'", () => {
    // Mirrors adr-commit/SKILL.md, which embeds an unrelated ADR document
    // template using "## 1. Title" .. "## 10. Cycle Retrospective" headings
    // alongside its real "## Step N:" workflow headings.
    const content = [
      "## Step 1: Verify Tests",
      "body",
      "## 1. Title",
      "template field",
      "## 2. Context",
      "template field",
    ].join("\n");
    expect(extractChecklist(content)).toEqual(["Step 1: Verify Tests"]);
  });

  it("returns an empty array when neither pattern is present", () => {
    expect(extractChecklist("## Some Other Heading\nprose only")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractCommands
// ---------------------------------------------------------------------------

describe("extractCommands", () => {
  it("extracts multiple fenced bash blocks in document order", () => {
    const content = [
      "```bash",
      "echo one",
      "```",
      "prose",
      "```bash",
      "echo two",
      "echo three",
      "```",
    ].join("\n");
    expect(extractCommands(content)).toEqual(["echo one", "echo two\necho three"]);
  });

  it("extracts fenced sh blocks", () => {
    const content = ["```sh", "ls -la", "```"].join("\n");
    expect(extractCommands(content)).toEqual(["ls -la"]);
  });

  it("ignores fenced blocks tagged with a non-shell language", () => {
    const content = ["```yaml", "key: value", "```", "```markdown", "# title", "```"].join("\n");
    expect(extractCommands(content)).toEqual([]);
  });

  it("returns an empty array when no fenced blocks are present", () => {
    expect(extractCommands("just prose, no code")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractGotchas
// ---------------------------------------------------------------------------

describe("extractGotchas", () => {
  it("parses YAML-ish gotcha entries and keeps only ACTIVE ones", () => {
    const content = [
      "## Gotchas",
      "- claim: >-",
      "    Assumed the cache was warm.",
      "  do_instead: >-",
      "    Always check cache.has() first.",
      "  status: ACTIVE",
      "- claim: >-",
      "    An old, resolved claim.",
      "  do_instead: >-",
      "    N/A",
      "  status: RESOLVED",
    ].join("\n");

    const gotchas = extractGotchas(content);
    expect(gotchas).toHaveLength(1);
    expect(gotchas[0].claim).toBe("Assumed the cache was warm.");
    expect(gotchas[0].doInstead).toBe("Always check cache.has() first.");
    expect(gotchas[0].status).toBe("ACTIVE");
  });

  it("parses the legacy one-liner style: - [date] claim | cause | do-instead", () => {
    const content = [
      "## Gotchas",
      "- [2024-01-01] Assumed prod config | missing env var | Read from .env.example",
    ].join("\n");

    const gotchas = extractGotchas(content);
    expect(gotchas).toHaveLength(1);
    expect(gotchas[0].claim).toBe("Assumed prod config");
    expect(gotchas[0].doInstead).toBe("Read from .env.example");
    expect(gotchas[0].status).toBe("ACTIVE");
  });

  it("returns an empty array when there is no Gotchas section", () => {
    expect(extractGotchas("## Other\nprose")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractOutput
// ---------------------------------------------------------------------------

describe("extractOutput", () => {
  it.each(["Output", "Output Template", "Evidence Summary", "Execution Handoff"])(
    "resolves the '%s' heading alias",
    (heading) => {
      const content = `## ${heading}\nthe output body\n## Next\nignored`;
      expect(extractOutput(content)).toBe("the output body");
    },
  );

  it("returns an empty string when none of the aliases are present", () => {
    expect(extractOutput("## Unrelated\nprose")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// SkillLoader.load — real-corpus regression locks
// ---------------------------------------------------------------------------

describe("SkillLoader.load (real docs/DPS-superskills-v5.2.1 corpus)", () => {
  const VALID_REGISTERS = new Set(["DISCIPLINE", "TECHNIQUE", "KNOWLEDGE LAYER", "REFERENCE"]);

  it("loads all 31 registered skills without throwing", async () => {
    expect(SKILL_NAMES.length).toBe(31);
    await Promise.all(SKILL_NAMES.map(name => SkillLoader.load(name)));
  });

  it("never leaves register empty, even for skills with no inline '**Register:**' line", async () => {
    for (const name of SKILL_NAMES) {
      const skill = await SkillLoader.load(name);
      expect(skill.register, `${name} should have a non-empty register`).not.toBe("");
      expect(VALID_REGISTERS.has(skill.register), `${name} register "${skill.register}" should be a known register`).toBe(true);
    }
  });

  it("does not truncate session-handoff's handoff-document section at the fenced template's inner heading", async () => {
    const skill = await SkillLoader.load("session-handoff");
    expect(skill.fullContent).toContain("## The Handoff Document");
    const section = extractSection(skill.fullContent, "The Handoff Document");
    expect(section).toContain("## Task Summary");
    expect(section).toContain("## Skills in Use");
  });

  it("extracts adr-commit's checklist only from real 'Step N' headings, excluding the embedded ADR template", async () => {
    const skill = await SkillLoader.load("adr-commit");
    expect(skill.checklist.length).toBe(9);
    for (const item of skill.checklist) {
      expect(item).toMatch(/^Step \d/);
    }
  });

  it("extracts adr-commit's bash commands including the one nested under an indented bullet fence", async () => {
    const skill = await SkillLoader.load("adr-commit");
    expect(skill.commands.length).toBe(14);
    expect(skill.commands.some(c => c.includes("git worktree remove"))).toBe(true);
  });

  it("extracts skill-init's scaffold commands as runnable bash blocks", async () => {
    const skill = await SkillLoader.load("skill-init");
    expect(skill.commands.length).toBe(15);
  });
});
