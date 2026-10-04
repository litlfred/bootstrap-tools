import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { publishSite } from "./publish-site.ts";

const g = (cwd: string, ...a: string[]) => execFileSync("git", a, { cwd, encoding: "utf-8" }).trim();

/** A bare remote whose `gh-pages` holds one stale file. */
function remote(): string {
  const d = mkdtempSync(join(tmpdir(), "pubsite-"));
  g(d, "init", "-q", "--bare", "remote.git");
  const seed = join(d, "seed");
  g(d, "init", "-q", "-b", "gh-pages", "seed");
  writeFileSync(join(seed, "stale.html"), "old\n");
  g(seed, "add", "-A");
  g(seed, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "seed");
  g(seed, "push", "-q", join(d, "remote.git"), "gh-pages");
  return join(d, "remote.git");
}

function staged(files: Record<string, string>): string {
  const d = mkdtempSync(join(tmpdir(), "pubsite-site-"));
  for (const [p, t] of Object.entries(files)) { mkdirSync(join(d, p, ".."), { recursive: true }); writeFileSync(join(d, p), t); }
  return d;
}

function read(remoteUrl: string, path: string): string | undefined {
  const d = mkdtempSync(join(tmpdir(), "pubsite-read-"));
  g(d, "clone", "-q", "--branch", "gh-pages", remoteUrl, "r");
  return existsSync(join(d, "r", path)) ? readFileSync(join(d, "r", path), "utf-8") : undefined;
}

describe("publish-site — any runner, any git remote (bootstrap-tools#7)", () => {
  test("a full replace: the staged site lands and a file it does not hold is gone", () => {
    const r = remote();
    const res = publishSite({ site: staged({ "index.html": "new\n", "subgraph/v0/context.jsonld": "{}\n" }), remote: r, backoff: 0 });
    expect(res.state).toBe("published");
    expect(read(r, "index.html")).toBe("new\n");
    expect(read(r, "subgraph/v0/context.jsonld")).toBe("{}\n");
    expect(read(r, "stale.html")).toBeUndefined();
  });

  test("publishing the same site twice is `current`, not a second commit", () => {
    const r = remote();
    const site = staged({ "index.html": "same\n" });
    expect(publishSite({ site, remote: r, backoff: 0 }).state).toBe("published");
    expect(publishSite({ site, remote: r, backoff: 0 }).state).toBe("current");
  });

  test("an empty or missing site is refused, never published over the branch", () => {
    const r = remote();
    expect(publishSite({ site: staged({}), remote: r, backoff: 0 }).state).toBe("failed");
    expect(publishSite({ site: "/nonexistent-site-dir", remote: r, backoff: 0 }).state).toBe("failed");
    expect(read(r, "stale.html")).toBe("old\n");
  });

  test("an unreachable remote fails with a reason rather than throwing", () => {
    const res = publishSite({ site: staged({ "a.html": "x\n" }), remote: "/nonexistent/remote.git", attempts: 1, backoff: 0 });
    expect(res.state).toBe("failed");
  });
});
