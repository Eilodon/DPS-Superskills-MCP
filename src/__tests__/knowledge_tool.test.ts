/**
 * knowledge_tool.test.ts — coverage for kb_write slug validation and
 * kb_query summary/detail modes.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { z } from "zod/v4";
import knowledgeTools from "../plugins/knowledge.tool.js";

const kbWrite = knowledgeTools.find(t => t.name === "kb_write")!;
const kbQuery = knowledgeTools.find(t => t.name === "kb_query")!;

let testKbDir: string;

function kbDir(): string {
  return testKbDir;
}

const writtenSlugs = new Set<string>();

async function runHandler(tool: typeof kbWrite, args: Record<string, unknown>) {
  // Re-validate input via the same Zod schema the registry uses.
  const schema = z.object(tool.inputSchema as Record<string, z.ZodTypeAny>);
  const parsed = schema.parse(args);
  if (tool.name === "kb_write" && typeof (parsed as { slug?: string }).slug === "string") {
    writtenSlugs.add((parsed as { slug: string }).slug);
  }
  return tool.handler(parsed, {} as never);
}

beforeAll(async () => {
  testKbDir = await fs.mkdtemp(path.join(os.tmpdir(), "dps-kb-test-"));
  process.env.MCP_KB_PATH = testKbDir;
});

afterAll(async () => {
  delete process.env.MCP_KB_PATH;
  await fs.rm(testKbDir, { recursive: true, force: true });
});

describe("kb_write slug sanitization", () => {
  it("rejects slug containing path traversal characters", () => {
    const schema = z.object(kbWrite.inputSchema as Record<string, z.ZodTypeAny>);
    const result = schema.safeParse({
      category: "gotcha",
      slug: "../../../etc/passwd",
      content: "should fail validation",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with whitespace / newline", () => {
    const schema = z.object(kbWrite.inputSchema as Record<string, z.ZodTypeAny>);
    expect(schema.safeParse({ category: "gotcha", slug: "with space", content: "x" }).success).toBe(false);
    expect(schema.safeParse({ category: "gotcha", slug: "with\nnewline", content: "x" }).success).toBe(false);
  });

  it("rejects uppercase / underscore", () => {
    const schema = z.object(kbWrite.inputSchema as Record<string, z.ZodTypeAny>);
    expect(schema.safeParse({ category: "gotcha", slug: "Async_no_await", content: "x" }).success).toBe(false);
  });

  it("accepts valid kebab-case slugs", () => {
    const schema = z.object(kbWrite.inputSchema as Record<string, z.ZodTypeAny>);
    expect(schema.safeParse({ category: "gotcha", slug: "async-no-await", content: "x" }).success).toBe(true);
    expect(schema.safeParse({ category: "decision", slug: "use-redis-v7", content: "x" }).success).toBe(true);
  });
});

describe("kb_query tiered retrieval", () => {
  const testSlug = `test-entry-${Date.now()}`;

  it("returns summary mode by default and detail mode when requested", async () => {
    await runHandler(kbWrite, {
      category: "gotcha",
      slug: testSlug,
      content: "A long gotcha body about timeouts. ".repeat(8),
    });

    const summary: any = await runHandler(kbQuery, { query: testSlug });
    const summaryText = summary.content[0].text as string;
    expect(summaryText).toContain("(summary)");
    expect(summaryText).toContain(`KB-GOTCHA-${testSlug}`);
    // Summary truncates content to ~140 chars and does NOT contain the YAML
    // structure markers from the entry body.
    expect(summaryText).not.toContain("**date:**");

    const detail: any = await runHandler(kbQuery, { query: testSlug, detail: true });
    const detailText = detail.content[0].text as string;
    expect(detailText).toContain("(detail=true)");
    expect(detailText).toContain("**date:**");
    expect(detailText).toContain("**source:**");
  });

  it("respects the limit parameter", async () => {
    const result: any = await runHandler(kbQuery, { query: "KB-", limit: 1 });
    expect(result.content[0].text).toMatch(/1 result\(s\)|No entries/);
  });
});
