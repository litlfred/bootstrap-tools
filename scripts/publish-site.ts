#!/usr/bin/env bun
/**
 * Publish a staged site onto a branch (default `gh-pages`) as a FULL REPLACE.
 *
 * @module scripts/publish-site
 *
 * Owner, 2026-10-04 (bootstrap-tools#7): "dont want tight/exclusive github
 * Tools … can we also support agentic workflow". Until now this step was an
 * inline shell loop inside `.github/workflows/pages.yml`, so only a GitHub
 * runner could publish. It is now the same command for every runner — an
 * agent, a person at a terminal, or a CI job:
 *
 *   bun run bootstrap-tools/scripts/site.ts --root . --out _site-src
 *   bun run bootstrap-tools/scripts/publish-site.ts --site _site-src --remote <git url>
 *
 * Nothing here is GitHub-specific: `--remote` is any git URL the caller can
 * push to, with whatever credentials that caller already has (a token in the
 * URL in CI, the user's own git credentials locally). Serving the branch —
 * GitHub Pages, or any static host that reads a branch — is the host's job.
 *
 * Rebuild, never rebase: each attempt clones the branch fresh, replaces every
 * tracked file with the staged site, and pushes. A push that loses a race is
 * retried from a fresh clone (3 attempts), so a concurrent publisher's commit
 * is never merged into ours or overwritten by a force push.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export interface PublishOptions {
  /** The staged site directory (what `site.ts --out` wrote). */
  site: string;
  /** Any git URL the caller can push to. */
  remote: string;
  branch?: string;
  message?: string;
  attempts?: number;
  /** Author for the publish commit. */
  name?: string;
  email?: string;
  /** Seconds between attempts, times the attempt number. */
  backoff?: number;
}

export type PublishResult =
  | { state: "published"; commit: string; attempt: number }
  | { state: "current" }
  | { state: "failed"; reason: string };

function git(cwd: string, ...args: string[]): { ok: boolean; out: string } {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

/** One clone-replace-commit-push cycle per attempt. */
export function publishSite(o: PublishOptions): PublishResult {
  const site = resolve(o.site);
  if (!existsSync(site) || !statSync(site).isDirectory()) return { state: "failed", reason: `${site} is not a directory` };
  if (readdirSync(site).length === 0) return { state: "failed", reason: `${site} is empty — refusing to publish an empty site over the branch` };
  const branch = o.branch ?? "gh-pages";
  const attempts = o.attempts ?? 3;
  let last = "";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const work = mkdtempSync(join(tmpdir(), "publish-site-"));
    try {
      const clone = git(work, "clone", "--quiet", "--branch", branch, "--single-branch", o.remote, "repo");
      if (!clone.ok) return { state: "failed", reason: `could not clone ${branch}: ${clone.out}` };
      const repo = join(work, "repo");
      for (const f of readdirSync(repo)) if (f !== ".git") rmSync(join(repo, f), { recursive: true, force: true });
      cpSync(site, repo, { recursive: true });
      git(repo, "config", "user.name", o.name ?? "site publisher");
      git(repo, "config", "user.email", o.email ?? "site-publisher@users.noreply.github.com");
      git(repo, "add", "-A");
      if (git(repo, "diff", "--cached", "--quiet").ok) return { state: "current" };
      const commit = git(repo, "commit", "--quiet", "-m", o.message ?? "Publish site");
      if (!commit.ok) return { state: "failed", reason: `commit failed: ${commit.out}` };
      const push = git(repo, "push", "--quiet", "origin", branch);
      if (push.ok) return { state: "published", commit: git(repo, "rev-parse", "HEAD").out, attempt };
      last = push.out;
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
    if (attempt < attempts && (o.backoff ?? 5) > 0) Bun.sleepSync(attempt * (o.backoff ?? 5) * 1000);
  }
  return { state: "failed", reason: `push to ${branch} failed after ${attempts} attempt(s): ${last}` };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const site = opt("--site");
  const remote = opt("--remote");
  if (!site || !remote) {
    console.error("usage: bun run bootstrap-tools/scripts/publish-site.ts --site <staged dir> --remote <git url> [--branch gh-pages] [--message <msg>]");
    process.exit(2);
  }
  const r = publishSite({ site, remote, branch: opt("--branch"), message: opt("--message"), name: opt("--name"), email: opt("--email") });
  if (r.state === "published") console.log(`published ${r.commit} (attempt ${r.attempt})`);
  else if (r.state === "current") console.log("branch already current");
  else { console.error(r.reason); process.exit(1); }
}
