import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { documentsSection, publishedDocuments, stageSite, stagedPaths } from "./site.ts";

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

  test("every JSON Schema and JSON-LD document is staged at the address it names, with a .json copy of JSON-LD", () => {
    const r2 = join(top, "vocab");
    mkdirSync(join(r2, "schemas"), { recursive: true });
    writeFileSync(join(r2, "vocab.json"), JSON.stringify({ name: "vocab", version: "1.2.3", iriBase: "https://x.example/vocab/", directories: [] }));
    writeFileSync(join(r2, "README.md"), "# vocab\n");
    writeFileSync(join(r2, "schemas", "a.schema.json"), JSON.stringify({ $id: "https://x.example/vocab/1.2.3/schemas/a.schema.json" }));
    writeFileSync(join(r2, "ns.jsonld"), JSON.stringify({ "@context": {}, "@id": "https://x.example/vocab/1.2.3/ns" }));
    writeFileSync(join(r2, "elsewhere.json"), JSON.stringify({ $id: "https://other.example/x.json" }));
    spawnSync("git", ["init", "-q"], { cwd: r2 });
    const docs = publishedDocuments(r2);
    expect(docs.map((d) => [d.iri, d.path, d.kind])).toEqual([
      ["https://x.example/vocab/1.2.3/ns", "1.2.3/ns", "json-ld"],
      ["https://x.example/vocab/1.2.3/schemas/a.schema.json", "1.2.3/schemas/a.schema.json", "json-schema"],
    ]);
    expect(stagedPaths(docs[0]!)).toEqual(["1.2.3/ns", "1.2.3/ns.json"]);
    const out = join(top, "_vocab");
    const r = stageSite(r2, out);
    expect(r.problems).toEqual([]);
    for (const p of ["1.2.3/ns", "1.2.3/ns.json", "1.2.3/ns.jsonld", "1.2.3/schemas/a.schema.json"]) expect(existsSync(join(out, p)), p).toBe(true);
    expect(readFileSync(join(out, "1.2.3/ns"), "utf-8")).toBe(readFileSync(join(r2, "ns.jsonld"), "utf-8"));
    const index = readFileSync(join(out, "index.md"), "utf-8");
    expect(index).toContain('## <a id="published-documents"></a>Published documents');
    expect(index).toContain("[Published documents](#published-documents)");
    expect(documentsSection(docs)).toContain("[`https://x.example/vocab/1.2.3/ns`](1.2.3/ns) ([`.json`](1.2.3/ns.json))");
  });

  test("no iriBase, no document addresses: nothing claimed", () => {
    expect(publishedDocuments(root)).toEqual([]);
  });
});

