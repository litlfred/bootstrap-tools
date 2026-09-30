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
 * What lands in `--out`, in the order it is written — first writer wins,
 * because nothing already in `--out` is overwritten (`publish-files.ts`):
 *
 * 1. for bootstrap only, its graph (`export-graph.ts`) at
 *    `<base-url>bootstrap.jsonld`, and its `.json` copy at `bootstrap.json`.
 *    That copy shares its address with the declaration, and the graph keeps
 *    it, as `bootstrap-graph-publication` says and as the harness's own site
 *    build does (`--allow-collision bootstrap.json`). The declaration is still
 *    served, at `<version>/bootstrap.json`, and the skip is reported;
 * 2. every DOCUMENT the instance publishes at the address it names — each
 *    JSON Schema's `$id` and each JSON-LD document's `@id` under `iriBase`
 *    ({@link publishedDocuments}). An `@id` with no extension (`…/0.1.0/ns`,
 *    the namespace a vocabulary is) gets the document at that extensionless
 *    path, as the harness's build copies `processes/ns.jsonld` to
 *    `processes/ns`; every `.jsonld` also gets a `.json` copy, because Pages
 *    serves `.jsonld` as a download and `.json` as JSON. The `.jsonld` stays
 *    the real one;
 * 3. every file of the instance, as it sits (`publish-files.ts`), so every
 *    relative link in them still resolves — and again under `<version>/`,
 *    because an IRI a program reads is `<iriBase><version>/…`;
 * 4. `index.md`, the book (`readme-book.ts`), with its links checked, ending
 *    in a "Published documents" section that links every address above;
 * 5. `_config.yml`, when the instance has none: the title and the theme.
 *
 * Every `@context` bootstrap writes is inline in its document (measured
 * 2026-09-30: no file names an external context), so publishing each document
 * publishes its context; there is no separate context file to serve.
 *
 * `--check` stages into a temporary directory, lists every document address
 * and fails on any problem: an address nothing is staged at, a link on the
 * index page that would not land, an address taken by a different file.
 *
 * Usage: bun run bootstrap-tools/scripts/site.ts --root ../bootstrap (--out ../_site-src | --check) [--base-url <url>] [--provenance]
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, relative } from "node:path";

import { readKnowledgeGraphDeclaration } from "../schemas/declaration.ts";
import { exportGraph } from "./export-graph.ts";
import { publishFiles } from "./publish-files.ts";
import { gitFiles } from "./git-files.ts";
import { buildBook, danglingFragments, readReadmes } from "./readme-book.ts";

/** A document the instance publishes at an address it names itself. */
export interface PublishedDocument {
  /** The address, as the document names it (no fragment). */
  iri: string;
  /** Where it is staged: the address with `iriBase` removed. */
  path: string;
  /** The file it comes from, relative to the instance root; `undefined` for a document built at publish time. */
  source?: string;
  kind: "json-schema" | "json-ld";
}

/**
 * Every document `root` publishes at an address it names: each JSON file git
 * accounts for whose top-level `$id` (a JSON Schema) or `@id` (a JSON-LD
 * document) lies under the declaration's `iriBase`, and — for bootstrap —
 * the graph export. Read from the files, never from a list kept here, so a
 * schema added tomorrow is published tomorrow. Empty when there is no
 * `iriBase`: an address nobody declared is not one to publish at.
 */
export function publishedDocuments(root: string, baseUrl?: string): PublishedDocument[] {
  const decl = readKnowledgeGraphDeclaration(root);
  const base = (baseUrl ?? decl?.iriBase)?.replace(/\/?$/, "/");
  if (!decl || !base) return [];
  const out: PublishedDocument[] = [];
  for (const abs of gitFiles(root) ?? []) {
    if (!/\.(json|jsonld)$/.test(abs) || !existsSync(abs)) continue;
    let doc: Record<string, unknown>;
    try {
      doc = JSON.parse(readFileSync(abs, "utf-8")) as Record<string, unknown>;
    } catch {
      continue;
    }
    const id = typeof doc["$id"] === "string" ? (doc["$id"] as string) : typeof doc["@id"] === "string" ? (doc["@id"] as string) : undefined;
    const iri = id?.split("#")[0];
    if (!iri || !iri.startsWith(base) || iri === base) continue;
    out.push({ iri, path: iri.slice(base.length), source: relative(root, abs).split("\\").join("/"), kind: "$id" in doc ? "json-schema" : "json-ld" });
  }
  if (decl.name === "bootstrap") out.push({ iri: `${base}bootstrap.jsonld`, path: "bootstrap.jsonld", kind: "json-ld" });
  return out.sort((a, b) => (a.iri < b.iri ? -1 : a.iri > b.iri ? 1 : 0));
}

/** The paths a published document is staged at: its own, and the `.json` copy of a `.jsonld` or of an extensionless JSON-LD address. */
export function stagedPaths(d: PublishedDocument): string[] {
  if (d.kind !== "json-ld") return [d.path];
  if (d.path.endsWith(".jsonld")) return [d.path, d.path.replace(/\.jsonld$/, ".json")];
  if (!posix.extname(d.path)) return [d.path, `${d.path}.json`];
  return [d.path];
}

/** The "Published documents" section of the index page: every address, linked. */
export function documentsSection(docs: readonly PublishedDocument[]): string {
  if (docs.length === 0) return "";
  const rows = docs.map((d) => {
    const alias = stagedPaths(d).slice(1).map((p) => ` ([\`.json\`](${p}))`).join("");
    return `| [\`${d.iri}\`](${d.path})${alias} | ${d.kind === "json-schema" ? "JSON Schema" : "JSON-LD"} | ${d.source ? `\`${d.source}\`` : "built when the site is published"} |`;
  });
  return [
    "Every document this repository publishes at an address it names itself: each JSON Schema at its `$id`, each JSON-LD document at its `@id`. A program following one of these addresses gets that document. Where a host would serve `.jsonld` as a download, a `.json` copy with the same bytes sits beside it.",
    "",
    "| address | what | from |",
    "|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

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

  // The graph first: its `.json` copy keeps the address it shares with the
  // declaration (bootstrap-graph-publication), and nothing written after it
  // may take that address.
  const base = (opts.baseUrl ?? decl.iriBase)?.replace(/\/?$/, "/");
  if (decl.name === "bootstrap") {
    if (!base) report.problems.push("no --base-url and no iriBase: bootstrap.jsonld not written, because its @id would be a guess");
    else {
      const doc = `${JSON.stringify(exportGraph(root, { docIri: `${base}bootstrap.jsonld`, provenance: opts.provenance ?? false }), null, 2)}\n`;
      put("bootstrap.jsonld", doc);
      put("bootstrap.json", doc);
    }
  }

  // Each document at the address it names, and its `.json` copy.
  const docs = publishedDocuments(root, opts.baseUrl);
  for (const d of docs) {
    if (!d.source) continue;
    const bytes = readFileSync(join(root, d.source), "utf-8");
    for (const p of stagedPaths(d)) {
      const at = join(out, p);
      if (existsSync(at)) {
        if (readFileSync(at, "utf-8") !== bytes) report.problems.push(`${p}: ${d.iri} names this address, and a different file is already there`);
        continue;
      }
      mkdirSync(dirname(at), { recursive: true });
      copyFileSync(join(root, d.source), at);
      report.written.push(p);
    }
  }

  // Then every file as it sits. An authored index.md would be the
  // instance's own front page and win, with the book reported as not written.
  // A skip is reported only where the file there DIFFERS: a document already
  // staged at its own address is the same bytes, not a collision.
  const differs = (dir: string, f: string) => readFileSync(join(dir, f)).compare(readFileSync(join(root, f))) !== 0;
  const files = publishFiles(root, out);
  report.written.push(...files.written);
  report.skipped.push(...files.skipped.filter((f) => differs(out, f)));
  if (decl.version && decl.iriBase) {
    const v = publishFiles(root, join(out, decl.version));
    report.written.push(...v.written.map((f) => `${decl.version}/${f}`));
    report.skipped.push(...v.skipped.filter((f) => differs(join(out, decl.version!), f)).map((f) => `${decl.version}/${f}`));
  }

  // A document whose address is taken by something else is a broken IRI.
  for (const d of docs) if (!existsSync(join(out, d.path))) report.problems.push(`${d.iri} is not staged at ${d.path}`);

  const readmes = readReadmes(root);
  if (!readmes) report.problems.push("git could not say which READMEs there are, so there is no index page");
  else {
    const book = buildBook(root, readmes, {
      title: decl.title ?? decl.name,
      description: decl.description,
      jekyll: true,
      appendix: docs.length ? { id: "published-documents", title: "Published documents", body: documentsSection(docs) } : undefined,
    });
    report.problems.push(...book.problems, ...danglingFragments(book.markdown).map((f) => `index.md links to ${f}, which no anchor carries`));
    put("index.md", book.markdown);
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
  const check = args.includes("--check");
  const out = arg("--out") ?? (check ? mkdtempSync(join(tmpdir(), "site-check-")) : undefined);
  if (!out) {
    console.error("usage: site.ts --root <instance> (--out <dir> | --check) [--base-url <url>] [--provenance]");
    process.exit(2);
  }
  const r = stageSite(root, out, { baseUrl: arg("--base-url"), provenance: args.includes("--provenance") });
  const docs = publishedDocuments(root, arg("--base-url"));
  console.log(`Staged ${r.written.length} file(s) from ${root} in ${out}.`);
  console.log(`${docs.length} document(s) at the address each names:`);
  for (const d of docs) console.log(`  ${existsSync(join(out, d.path)) ? "✓" : "✗"} ${d.iri}  ←  ${d.source ?? "built"}`);
  for (const s of r.skipped) console.log(`  not written, already there: ${s}`);
  for (const p of r.problems) console.error(`  ✗ ${p}`);
  if (check) rmSync(out, { recursive: true, force: true });
  if (r.problems.length) process.exit(1);
}
