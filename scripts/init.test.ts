import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { enablePagesByHand, exitStatus, initSteps, offlineProbe, ownerRepo, type Probe } from "./init.ts";

/** A fake instance `demo` needing `base`, as sibling checkouts. */
function fixture(opts: { workflow?: boolean; withBase?: boolean } = {}): string {
  const top = mkdtempSync(join(tmpdir(), "init-"));
  const root = join(top, "demo");
  mkdirSync(join(root, "skills"), { recursive: true });
  writeFileSync(join(root, "skills", "x.md"), "x\n");
  writeFileSync(join(root, "README.md"), "# demo\n");
  writeFileSync(
    join(root, "demo.json"),
    JSON.stringify({
      name: "demo",
      repository: "someone/demo",
      needs: ["base"],
      directories: [
        { id: "skills", path: "skills/", graphKinds: ["skills"] },
        { id: "gone", path: "gone/", graphKinds: ["skills"] },
      ],
    }),
  );
  if (opts.workflow) {
    mkdirSync(join(root, ".github", "workflows"), { recursive: true });
    writeFileSync(join(root, ".github", "workflows", "pages.yml"), "steps:\n  - uses: actions/deploy-pages@v4\n");
  }
  if (opts.withBase) {
    mkdirSync(join(top, "base", "docs", "bootstrap"), { recursive: true });
    writeFileSync(join(top, "base", "base.json"), JSON.stringify({ name: "base", directories: [] }));
    writeFileSync(join(top, "base", "docs", "bootstrap", "initialization.md"), "do this\n");
  }
  return root;
}

const state = (steps: { id: string; state: string }[], id: string) => steps.find((s) => s.id === id)?.state;

describe("init — the steps the declarations name, in four states", () => {
  test("owner/repo from either form", () => {
    expect(ownerRepo("litlfred/bootstrap")).toEqual({ owner: "litlfred", repo: "bootstrap" });
    expect(ownerRepo("https://github.com/litlfred/bootstrap.git")).toEqual({ owner: "litlfred", repo: "bootstrap" });
    expect(ownerRepo(undefined)).toBeUndefined();
  });

  test("declared directories, needs and the README are checked, not assumed", async () => {
    const { steps } = await initSteps(fixture(), { probe: offlineProbe, dryRun: true });
    expect(state(steps, "declaration")).toBe("done");
    expect(state(steps, "directory:skills")).toBe("done");
    expect(state(steps, "directory:gone")).toBe("not-done");
    expect(state(steps, "needs:base")).toBe("not-done");
    expect(state(steps, "readme")).toBe("done");
    expect(state(steps, "site:workflow")).toBe("not-done");
  });

  test("a needed harness's own instructions are STATED, never done", async () => {
    const { steps } = await initSteps(fixture({ withBase: true }), { probe: offlineProbe, dryRun: true });
    expect(state(steps, "needs:base")).toBe("done");
    expect(state(steps, "instructions:base")).toBe("stated");
  });

  test("no gh: Pages is could-not-determine, with the one manual step — never done, never silent", async () => {
    const { steps } = await initSteps(fixture({ workflow: true }), { probe: offlineProbe, dryRun: true });
    const s = steps.find((x) => x.id === "site:enabled")!;
    expect(s.state).toBe("could-not-determine");
    expect(s.action).toBe(enablePagesByHand({ owner: "someone", repo: "demo" }));
    expect(s.action).toContain("https://github.com/someone/demo/settings/pages");
    expect(state(steps, "site:live")).toBe("could-not-determine");
  });

  test("with a signed-in gh and Pages off, it enables Pages built by a workflow, then checks again", async () => {
    const calls: string[][] = [];
    let on = false;
    const probe: Probe = {
      gh(args) {
        calls.push(args);
        if (args[0] === "auth") return { status: 0, stdout: "", stderr: "" };
        if (args.includes("POST")) {
          on = true;
          return { status: 0, stdout: "{}", stderr: "" };
        }
        return on ? { status: 0, stdout: '{"build_type":"workflow"}', stderr: "" } : { status: 1, stdout: "", stderr: "HTTP 404: Not Found" };
      },
      httpStatus: async () => 404,
    };
    const { steps } = await initSteps(fixture({ workflow: true }), { probe });
    const s = steps.find((x) => x.id === "site:enabled")!;
    expect(s.state).toBe("done");
    expect(s.performed).toBe(true);
    expect(calls).toContainEqual(["api", "-X", "POST", "repos/someone/demo/pages", "-f", "build_type=workflow"]);
    expect(state(steps, "site:live")).toBe("not-done");
  });

  test("--dry-run never enables anything", async () => {
    const probe: Probe = {
      gh: (args) => (args[0] === "auth" ? { status: 0, stdout: "", stderr: "" } : args.includes("POST") ? (() => { throw new Error("enabled in a dry run"); })() : { status: 1, stdout: "", stderr: "HTTP 404" }),
      httpStatus: async () => undefined,
    };
    const { steps } = await initSteps(fixture({ workflow: true }), { probe, dryRun: true });
    expect(state(steps, "site:enabled")).toBe("not-done");
  });

  test("exit status: not-done outranks could-not-determine, which is never 0", () => {
    expect(exitStatus([{ id: "a", namedBy: "x", what: "", detail: "", state: "done" }])).toBe(0);
    expect(exitStatus([{ id: "a", namedBy: "x", what: "", detail: "", state: "could-not-determine" }])).toBe(3);
    expect(
      exitStatus([
        { id: "a", namedBy: "x", what: "", detail: "", state: "could-not-determine" },
        { id: "b", namedBy: "x", what: "", detail: "", state: "not-done" },
      ]),
    ).toBe(1);
  });
});
