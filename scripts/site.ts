#!/usr/bin/env bun
/**
 * Stage an instance's site for GitHub Pages: its files as they sit, the
 * one-page book of its READMEs as the index, and — for bootstrap — its own
 * Knowledge Graph at the address its `@id` names.
 *
 * @module bootstrap-tools/scripts/site
 * @covers code
 *
 * Owner, 2026-09-30: *"https://litlfred.github.io/bootstrap is 404"*. The
 * pieces existed (`publish-files.ts`, `export-graph.ts`) and nothing ran them
 * where bootstrap lives on its own. This is the one command a Pages workflow
 * runs; the workflow then hands the staged directory to
 * `actions/jekyll-build-pages`, which renders every `.md` to `.html` and
 * rewrites `.md` links to match — so this toolset still carries no Markdown
 * renderer (`check-closure.ts`).
 *
 * What lands in `--out`:
 *
 * - every file of the instance, as it sits (`publish-files.ts`), so every
 *   relative link in them still resolves;
 * - the same files under `<version>/` when the declaration has a version and
 *   an `iriBase`, because an IRI a program reads is `<iriBase><version>/…`
 *   and one that names a file should lead to it;
 * - `index.md`, the book (`readme-book.ts`), with its links checked;
 * - for bootstrap only, `bootstrap.jsonld` (`export-graph.ts`) at
 *   `<base-url>bootstrap.jsonld`. Its `.json` copy would be `bootstrap.json`,
 *   which is the declaration: the declaration wins and that is reported
 *   (`bootstrap-graph-publication`'s own rule — never overwrite);
 * - `_config.yml`, when the instance has none: the title and the theme.
 *
 * Nothing already in `--out` is overwritten.
 *
 * Usage: bun run bootstrap-tools/scripts/site.ts --root ../bootstrap --out ../_site-src [--base-url <url>] [--provenance]
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { readKnowledgeGraphDeclaration } from "../schemas/declaration.ts";
import { exportGraph } from "./export-graph.ts";
import { publishFiles } from "./publish-files.ts";
import { buildBook, danglingFragments, readReadmes } from "./readme-book.ts";

export interface SiteReport {
  written: string[];
  skipped: string[];
  problems: string[];
}

/** Stage `root`'s site in `out`. Throws when there is no declaration to read. */
export function stageSite(root: string, out: string, opts: { baseUrl?: string; provenance?: boolean } = {}): SiteReport {
  const decl = readKnowledgeGraphDeclaration(root);
  if (!decl) throw new Error(`${root} carries no Knowledge Graph declaration — there is no instance to publish`);
  mkdirSync(out, { recursive: true });
  const report: SiteReport = { written: [], skipped: [], problems: [] };
  const put = (rel: string, content: string) => {
    const p = join(out, rel);
    if (existsSync(p)) {
      report.skipped.push(rel);
      return;
    }
    writeFileSync(p, content);
    report.written.push(rel);
  };

  // Files first, then the book: an authored index.md is the instance's own
  // front page and wins, with the book reported as not written.
  const files = publishFiles(root, out);
  report.written.push(...files.written);
  report.skipped.push(...files.skipped);
  if (decl.version && decl.iriBase) {
    const v = publishFiles(root, join(out, decl.version));
    report.written.push(...v.written.map((f) => `${decl.version}/${f}`));
    report.skipped.push(...v.skipped.map((f) => `${decl.version}/${f}`));
  }

  const readmes = readReadmes(root);
  if (!readmes) report.problems.push("git could not say which READMEs there are, so there is no index page");
  else {
    const book = buildBook(root, readmes, { title: decl.title ?? decl.name, description: decl.description, jekyll: true });
    report.problems.push(...book.problems, ...danglingFragments(book.markdown).map((f) => `index.md links to ${f}, which no anchor carries`));
    put("index.md", book.markdown);
  }

  const base = (opts.baseUrl ?? decl.iriBase)?.replace(/\/?$/, "/");
  if (decl.name === "bootstrap") {
    if (!base) report.problems.push("no --base-url and no iriBase: bootstrap.jsonld not written, because its @id would be a guess");
    else {
      const doc = exportGraph(root, { docIri: `${base}bootstrap.jsonld`, provenance: opts.provenance ?? false });
      put("bootstrap.jsonld", `${JSON.stringify(doc, null, 2)}\n`);
      if (existsSync(join(out, "bootstrap.json"))) report.skipped.push("bootstrap.json (the graph's .json copy — the declaration is already there)");
    }
  }

  put("_config.yml", [`title: ${JSON.stringify(decl.title ?? decl.name)}`, `description: ${JSON.stringify(decl.description ?? "")}`, "theme: jekyll-theme-primer", ""].join("\n"));
  return report;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const arg = (f: string) => {
    const i = args.indexOf(f);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const root = arg("--root") ?? join(import.meta.dir, "..", "..", "bootstrap");
  const out = arg("--out");
  if (!out) {
    console.error("usage: site.ts --root <instance> --out <dir> [--base-url <url>] [--provenance]");
    process.exit(2);
  }
  const r = stageSite(root, out, { baseUrl: arg("--base-url"), provenance: args.includes("--provenance") });
  console.log(`Staged ${r.written.length} file(s) from ${root} in ${out}.`);
  for (const s of r.skipped) console.log(`  not written, already there: ${s}`);
  for (const p of r.problems) console.error(`  ✗ ${p}`);
  if (r.problems.length) process.exit(1);
}
