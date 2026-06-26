import { afterEach, describe, expect, test } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scaffoldSpec, detectExistingSpec, runDpsCheck, specDir, CANONICAL } from "../core/dps/init.js";

const tmpDirs: string[] = [];
function tmpRepo(): string {
  const d = mkdtempSync(join(tmpdir(), "dps-init-"));
  tmpDirs.push(d);
  return d;
}
afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

describe("scaffoldSpec", () => {
  test("creates the 4 canonical files from bootstrap templates into .dps/spec/", async () => {
    const root = tmpRepo();
    const res = await scaffoldSpec(root, false);
    expect(res.created.sort()).toEqual(CANONICAL.map(n => `${n}.md`).sort());
    expect(res.skipped).toEqual([]);
    for (const name of CANONICAL) {
      const f = join(specDir(root), `${name}.md`);
      expect(existsSync(f)).toBe(true);
      expect(readFileSync(f, "utf8").length).toBeGreaterThan(0);
    }
    // gitignore created, ignoring the index cache
    const gi = join(root, ".dps", ".gitignore");
    expect(existsSync(gi)).toBe(true);
    expect(readFileSync(gi, "utf8")).toContain("index/");
  });

  test("does not clobber existing files unless overwrite=true", async () => {
    const root = tmpRepo();
    await scaffoldSpec(root, false);
    const second = await scaffoldSpec(root, false);
    expect(second.created).toEqual([]);
    expect(second.skipped.sort()).toEqual(CANONICAL.map(n => `${n}.md`).sort());

    const overwrite = await scaffoldSpec(root, true);
    expect(overwrite.created.sort()).toEqual(CANONICAL.map(n => `${n}.md`).sort());
  });
});

describe("detectExistingSpec", () => {
  test("returns nothing for a fresh repo and all four after scaffold", async () => {
    const root = tmpRepo();
    expect(await detectExistingSpec(root)).toEqual([]);
    await scaffoldSpec(root, false);
    expect((await detectExistingSpec(root)).sort()).toEqual(CANONICAL.map(n => `${n}.md`).sort());
  });
});

describe("runDpsCheck", () => {
  test("returns a structured result and degrades gracefully without throwing", async () => {
    const root = tmpRepo();
    await scaffoldSpec(root, false);
    const r = await runDpsCheck(root, "lint", false);
    expect(typeof r.ran).toBe("boolean");
    expect(typeof r.output).toBe("string");
    // If python3 is unavailable, ran is false with a manual-fallback hint.
    if (!r.ran) expect(r.output.toLowerCase()).toContain("python3");
  });
});
