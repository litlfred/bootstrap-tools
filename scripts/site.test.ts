import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { stageSite } from "./site.ts";

describe("site — what a Pages workflow publishes", () => {
  const top = mkdtempSync(join(tmpdir(), "site-"));
  const root = join(top, "demo");
  mkdirSync(join(root, "skills"), { recursive: true });
  writeFileSync(join(root, "demo.json"), JSON.stringify({ name: "demo", title: "Demo", directories: [{ id: "skills", path: "skills/", graphKinds: ["skills"] }] }));
  writeFileSync(join(root, "README.md"), "# Demo\n\n## Start\n\nSee [skills](skills/README.md).\n");
  writeFileSync(join(root, "skills", "README.md"), "# skills\n\n## Every file\n");
  spawnSync("git", ["init", "-q"], { cwd: root });

  test("the index is the README page; the files sit beside it; nothing is overwritten", () => {
    const out = join(top, "_site-src");
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "_config.yml"), "title: kept\n");
    const r = stageSite(root, out);
    expect(r.problems).toEqual([]);
    const index = readFileSync(join(out, "index.md"), "utf-8");
    expect(index).toContain("## Contents");
    expect(index).toContain("[skills](#skills)");
    expect(existsSync(join(out, "skills", "README.md"))).toBe(true);
    expect(readFileSync(join(out, "_config.yml"), "utf-8")).toBe("title: kept\n");
    expect(r.skipped).toContain("_config.yml");
  });

  test("no declaration, no site", () => {
    expect(() => stageSite(join(top, "nothing"), join(top, "out2"))).toThrow();
  });
});
