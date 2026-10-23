/**
 * @module bootstrap-tools/scripts/gen-vocabulary.test
 * @graphNode none — a test
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { BOOTSTRAP_GRAPH_TYPOLOGIES, BOOTSTRAP_TERMS } from "../schemas/graph.ts";
import { bootstrapRelease, withLegacyMoved } from "../schemas/release-iri.ts";
import { termLabel, vocabulary } from "./gen-vocabulary.ts";

describe("bootstrap's vocabulary is exactly its terms (owner, 2026-09-30)", () => {
  const doc = vocabulary(bootstrapRelease()) as { "@id": string; "@context": Record<string, unknown>; "@graph": { "@id": string }[] };
  const ids = doc["@graph"].map((n) => n["@id"]);

  test("every defined term, in order, then every graph typology — and nothing else", () => {
    expect(ids).toEqual([
      ...Object.keys(BOOTSTRAP_TERMS).map((t) => `bootstrap:${t}`),
      ...Object.keys(BOOTSTRAP_GRAPH_TYPOLOGIES).map((k) => `bootstrap:graphTypology/${k}`),
    ]);
  });

  test("names nothing above bootstrap", () => {
    const text = JSON.stringify(doc);
    expect(text).not.toContain("folio-assistant");
    expect(text).not.toContain("cat-harness");
  });

  test("its @id is the file's own path under the release, so publishing the file serves the namespace", () => {
    expect(doc["@id"]).toBe(`${bootstrapRelease().agent}ns`);
    expect(doc["@context"]["bootstrap"]).toBe(`${doc["@id"]}#`);
  });

  test("the committed file is current", () => {
    const committed = readFileSync(join(import.meta.dir, "..", "..", "bootstrap", "ns.jsonld"), "utf-8");
    // TRANSITION (bootstrap-tools#39): bootstrap at an older commit still
    // spells its addresses `<iriBase><semver>/`; of this major, deprecated.
    const moved = withLegacyMoved(committed, bootstrapRelease());
    if (moved.count > 0) console.warn(`⚠ bootstrap/ns.jsonld: ${moved.count} deprecated legacy exact-semver address(es)`);
    expect(moved.text).toBe(`${JSON.stringify(doc, null, 2)}\n`);
  });

  test("labels read as words", () => {
    expect(termLabel("NodeSchema")).toBe("Node Schema");
    expect(termLabel("KnowledgeGraph")).toBe("Knowledge Graph");
  });
});
