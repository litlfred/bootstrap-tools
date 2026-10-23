#!/usr/bin/env bun
/**
 * check-node-iris.ts — a published node's own identifier names the path its
 * file sits at.
 *
 * ## Why
 *
 * Owner, 2026-09-29: *"make QA gate for KG nodes"*, on finding that the two
 * discussion schemas' `$id` (`…/skills/discussion/input.schema.json`) named a
 * path no file sits at (`schemas/discussion.input.schema.json`). Publishing a
 * Knowledge Graph means serving its files where they sit, under its release
 * address; an identifier that names another path can then never be
 * dereferenced, and nothing noticed because nothing asked.
 *
 * ## The rule
 *
 * For every Knowledge Graph in the checkout that declares an `iriBase`, and
 * every JSON or JSON-LD file under it whose own identifier — a top-level `$id`,
 * or a top-level `@id` — starts with its release address for agents
 * (`<iriBase>v<major>/`, see `release-iri.ts`):
 *
 *   the rest of the identifier, without its `#fragment`, must be the file's
 *   path relative to the Knowledge Graph's root — or that path without its
 *   extension (`processes/ns` for `processes/ns.jsonld`, the address a
 *   vocabulary is served at).
 *
 * An identifier under the instance's `iriBase` but at ANOTHER version is also
 * a finding: a document names its own release. Identifiers outside the base
 * are not this gate's question.
 *
 * **Transition (one release; remove with bootstrap-tools#39):** a legacy
 * `<iriBase><semver>/` identifier whose MAJOR is the declared major, at its
 * file's path, is a WARNING marked deprecated, not a failure — layers composed
 * at an older commit still spell it so (owner ruling 2026-10-23). Another
 * major, or a wrong path, still fails.
 *
 * ```sh
 * bun run check:node-iris
 * ```
 *
 * @module bootstrap-tools/scripts/check-node-iris
 * @covers schemas
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { knowledgeGraphsIn } from "../schemas/declaration.ts";
import { LEGACY_EXACT_SEMVER_UNTIL, type ReleaseIris, legacyExactSemver, releaseIris } from "../schemas/release-iri.ts";

export interface NodeIriFinding {
  file: string;
  iri: string;
  why: string;
  /**
   * TRANSITION (bootstrap-tools#39): a legacy exact-semver id of the declared
   * major — reported as a warning, never a failure. Remove with the tolerance.
   */
  deprecated?: true;
}

function jsonFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...jsonFiles(p));
    else if (/\.(json|jsonld)$/.test(entry)) out.push(p);
  }
  return out;
}

/** The node identifier a JSON document states about itself, if any. */
export function ownIdentifier(doc: unknown): string | undefined {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return undefined;
  const d = doc as { $id?: unknown; "@id"?: unknown };
  const id = typeof d.$id === "string" ? d.$id : typeof d["@id"] === "string" ? d["@id"] : undefined;
  return id;
}

/**
 * Findings for one Knowledge Graph root with its release. Pass `release` to
 * have a legacy `<iriBase><semver>/` id of the declared major read as
 * deprecated rather than as another release (one transition release,
 * bootstrap-tools#39); its path is still checked.
 */
export function checkNodeIris(root: string, iriBase: string, agentBase: string, release?: ReleaseIris): NodeIriFinding[] {
  const findings: NodeIriFinding[] = [];
  for (const file of jsonFiles(root)) {
    let doc: unknown;
    try {
      doc = JSON.parse(readFileSync(file, "utf-8"));
    } catch {
      continue; // not JSON a reader could take an identifier from; other gates own validity
    }
    const iri = ownIdentifier(doc);
    if (!iri || !iri.startsWith(iriBase)) continue;
    const rel = relative(root, file).split("\\").join("/");
    const legacy = release && !iri.startsWith(agentBase) ? legacyExactSemver(release, iri) : undefined;
    if (!iri.startsWith(agentBase) && !legacy) {
      findings.push({ file: rel, iri, why: `names a release other than this one (${agentBase})` });
      continue;
    }
    const path = iri.slice((legacy ?? agentBase).length).split("#")[0]!;
    const bare = rel.replace(/\.(json|jsonld)$/, "");
    if (path !== rel && path !== bare) {
      findings.push({ file: rel, iri, why: `names \`${path}\`, but the file sits at \`${rel}\`` });
    } else if (legacy) {
      findings.push({
        file: rel,
        iri,
        why: `a legacy exact-semver id; deprecated, tolerated until ${LEGACY_EXACT_SEMVER_UNTIL} — \`iri:sync\` moves it to ${agentBase}`,
        deprecated: true,
      });
    }
  }
  return findings;
}

if (import.meta.main) {
  const repoAt = process.argv.indexOf("--repo");
  const repo = repoAt >= 0 && process.argv[repoAt + 1] ? process.argv[repoAt + 1]! : join(import.meta.dir, "..", "..");
  const graphs = knowledgeGraphsIn(repo).flatMap(({ root, decl }) => {
    const r = releaseIris(decl);
    return r ? [{ root, name: decl.name, r }] : [];
  });
  if (graphs.length === 0) {
    console.log("No Knowledge Graph declares an iriBase; no published identifiers to check.");
    process.exit(0);
  }
  let bad = 0;
  for (const { root, name, r } of graphs) {
    const all = checkNodeIris(root, r.iriBase, r.agent, r);
    const warned = all.filter((f) => f.deprecated);
    const findings = all.filter((f) => !f.deprecated);
    const checked = jsonFiles(root).length;
    if (warned.length > 0) {
      console.warn(`⚠ ${name}: ${warned.length} deprecated legacy exact-semver identifier(s) — a warning, not a failure:`);
      for (const f of warned) console.warn(`  · ${f.file}: ${f.iri} — ${f.why}`);
    }
    if (findings.length === 0) {
      console.log(`✓ ${name}: every identifier under ${r.agent} is its file's path (${checked} JSON file(s) read).`);
      continue;
    }
    bad += findings.length;
    console.error(`✗ ${name}: ${findings.length} identifier(s) name a path their file does not sit at:`);
    for (const f of findings) console.error(`  · ${f.file}: ${f.iri} — ${f.why}`);
  }
  if (bad > 0) {
    console.error("Publishing files where they sit must serve every identifier: move the file, or change the identifier before it is published.");
    process.exit(1);
  }
}
