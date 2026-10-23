import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkNodeIris, ownIdentifier } from "./check-node-iris.ts";
import { releaseIris } from "../schemas/release-iri.ts";

const BASE = "https://example.org/kg/";
const AGENT = `${BASE}1.2.3/`;

function kg(files: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "node-iris-"));
  for (const [p, doc] of Object.entries(files)) {
    mkdirSync(join(root, p, ".."), { recursive: true });
    writeFileSync(join(root, p), JSON.stringify(doc));
  }
  return root;
}

describe("check-node-iris", () => {
  test("an identifier that is its file's path passes; so does the path without its extension", () => {
    const root = kg({
      "schemas/a.schema.json": { $id: `${AGENT}schemas/a.schema.json` },
      "processes/ns.jsonld": { "@id": `${AGENT}processes/ns` },
      "processes/other.jsonld": { "@id": `${AGENT}processes/other.jsonld#frag` },
    });
    expect(checkNodeIris(root, BASE, AGENT)).toEqual([]);
  });

  test("an identifier naming another path fails — the discussion-schema defect", () => {
    const root = kg({ "schemas/discussion.input.schema.json": { $id: `${AGENT}skills/discussion/input.schema.json` } });
    expect(checkNodeIris(root, BASE, AGENT).map((f) => f.why)).toEqual([
      "names `skills/discussion/input.schema.json`, but the file sits at `schemas/discussion.input.schema.json`",
    ]);
  });

  test("an identifier at another release of the same base fails; one outside the base is not this gate's", () => {
    const root = kg({
      "a.json": { $id: `${BASE}0.9.0/a.json` },
      "b.json": { $id: "https://elsewhere.org/b.json" },
    });
    expect(checkNodeIris(root, BASE, AGENT).map((f) => f.file)).toEqual(["a.json"]);
  });

  // TRANSITION (bootstrap-tools#39): remove these two with the tolerance.
  describe("a legacy exact-semver id during the transition release", () => {
    const R = releaseIris({ iriBase: BASE, version: "1.4.0" })!; // agent: <BASE>v1/

    test("of the declared major, at its file's path: a deprecated WARNING, not a failure", () => {
      const root = kg({
        "schemas/a.schema.json": { $id: `${BASE}1.2.3/schemas/a.schema.json` },
        "processes/ns.jsonld": { "@id": `${BASE}1.0.0/processes/ns` },
        "current.json": { $id: `${R.agent}current.json` },
      });
      const all = checkNodeIris(root, R.iriBase, R.agent, R);
      expect(all.filter((f) => !f.deprecated)).toEqual([]);
      expect(all.filter((f) => f.deprecated).map((f) => f.file).sort()).toEqual(["processes/ns.jsonld", "schemas/a.schema.json"]);
      expect(all.every((f) => !f.deprecated || /deprecated/.test(f.why))).toBe(true);
    });

    test("of ANOTHER major, or at the wrong path, still FAILS", () => {
      const root = kg({
        "a.json": { $id: `${BASE}0.9.0/a.json` },
        "b.json": { $id: `${BASE}2.0.0/b.json` },
        "c.json": { $id: `${BASE}1.2.3/elsewhere/c.json` },
      });
      const failing = checkNodeIris(root, R.iriBase, R.agent, R).filter((f) => !f.deprecated);
      expect(failing.map((f) => f.file).sort()).toEqual(["a.json", "b.json", "c.json"]);
      expect(failing.find((f) => f.file === "c.json")!.why).toBe("names `elsewhere/c.json`, but the file sits at `c.json`");
    });
  });

  test("only a document's own top-level identifier counts", () => {
    expect(ownIdentifier({ items: { $id: "x" } })).toBeUndefined();
    expect(ownIdentifier([{ "@id": "x" }])).toBeUndefined();
    expect(ownIdentifier({ "@id": "x" })).toBe("x");
  });
});
