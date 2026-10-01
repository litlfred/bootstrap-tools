import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { inject } from "./readme-sections.ts";
import { bootstrapTermTargets } from "./term-links.ts";

const tmp = mkdtempSync(join(tmpdir(), "readme-sections-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("README sections, written standalone", () => {
  test("only between a section's own markers, in the harness's form", () => {
    const readme = "intro\n<!-- kg:files:begin -->\nold\n<!-- kg:files:end -->\noutro\n";
    expect(inject(readme, "new body\n", "kg:files")).toBe("intro\n<!-- kg:files:begin -->\n\nnew body\n\n<!-- kg:files:end -->\noutro\n");
  });

  test("a README that has not opted in is left exactly as it is", () => {
    expect(inject("no markers here\n", "x", "kg:files")).toBe("no markers here\n");
  });
});

describe("a term link across two repositories is a URL; within one, a relative path", () => {
  const git = (cwd: string) => spawnSync("git", ["init", "-q"], { cwd });
  const mk = (base: string, separateRepos: boolean) => {
    const b = join(base, "bootstrap");
    mkdirSync(join(b, "schemas"), { recursive: true });
    writeFileSync(join(b, "schemas", "README.md"), "# terms\n");
    writeFileSync(join(b, "bootstrap.json"), '{"name":"bootstrap","repository":"litlfred/bootstrap"}\n');
    const t = join(base, "bootstrap-tools", "scripts");
    mkdirSync(t, { recursive: true });
    if (separateRepos) {
      git(b);
      git(join(base, "bootstrap-tools"));
    } else git(base);
    return { base, tools: t, bootstrap: b };
  };

  test("sibling clones: the tools' README names bootstrap's repository", () => {
    const { base, tools } = mk(join(tmp, "split"), true);
    const [t] = bootstrapTermTargets(base, tools, ["Process"]);
    expect(t!.href).toBe("https://github.com/litlfred/bootstrap/blob/main/schemas/README.md#process");
  });

  test("bootstrap's own README, in its own repository, links relatively", () => {
    const { base, bootstrap } = mk(join(tmp, "own"), true);
    const [t] = bootstrapTermTargets(base, bootstrap, ["Process"]);
    expect(t!.href).toBe("schemas/README.md#process");
  });

  test("one repository holding both: relative, as before", () => {
    const { base, tools } = mk(join(tmp, "mono"), false);
    const [t] = bootstrapTermTargets(base, tools, ["Process"]);
    expect(t!.href).toBe("../../bootstrap/schemas/README.md#process");
  });
});
