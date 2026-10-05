/**
 * @module bootstrap-tools/scripts/export-graph.test
 * @graphNode none — a test
 */
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { GraphExportSchema } from "../schemas/graph-export.ts";
import { COLLECTED_KINDS, exportGraph, firstSentence, parseXml } from "./export-graph.ts";
import { GENERATED_BY } from "./generated-by.ts";

const BOOTSTRAP = join(import.meta.dir, "..", "..", "bootstrap");
const DOC = "https://example.org/site/bootstrap/bootstrap.jsonld";
const build = (provenance = false) => exportGraph(BOOTSTRAP, { docIri: DOC, provenance });
type Node = { "@id": string; "@type": string; [k: string]: unknown };
const nodes = () => build()["@graph"] as Node[];

describe("bootstrap's graph, from bootstrap's files, in standard terms", () => {
  test("parses against its schema, with and without provenance", () => {
    for (const d of [build(), build(true)]) {
      const r = GraphExportSchema.safeParse(d);
      expect(r.success ? [] : r.error.issues).toEqual([]);
    }
  });

  test("pure: two builds are byte-identical, and nothing absolute from this machine appears", () => {
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
    expect(JSON.stringify(build())).not.toContain(BOOTSTRAP);
  });

  test("names nothing above bootstrap — no harness prefix, no harness property", () => {
    const text = JSON.stringify({ ...build(), "@id": "", "@graph": nodes().map((n) => ({ ...n, "@id": "" })) });
    expect(text).not.toContain("cat-harness");
    expect(text).not.toContain("folio-assistant");
  });

  test("every skill bootstrap holds is a node, at the id a harness links to", () => {
    const onDisk = readdirSync(join(BOOTSTRAP, "skills"))
      .filter((f) => f.endsWith(".md") && f !== "README.md")
      .map((f) => /^name:\s*(.+)$/m.exec(readFileSync(join(BOOTSTRAP, "skills", f), "utf-8"))?.[1]?.trim() ?? f.slice(0, -3))
      .sort();
    const inGraph = nodes().filter((n) => n["@type"] === "bootstrap:Skill").map((n) => n["@id"].split("#skill/")[1]).sort();
    expect(inGraph).toEqual(onDisk);
  });

  test("every link inside the graph lands on a node of it", () => {
    const ids = new Set([DOC, ...nodes().map((n) => n["@id"])]);
    const dangling: string[] = [];
    for (const n of nodes()) {
      for (const k of ["isPartOf", "sourceRef", "targetRef", "skill", "calledElement", "requires"]) {
        for (const v of ([] as unknown[]).concat(n[k] ?? [])) if (typeof v === "string" && !ids.has(v)) dangling.push(`${n["@id"]} ${k} → ${v}`);
      }
      for (const v of (n["flowNodeRef"] as string[] | undefined) ?? []) if (!ids.has(v)) dangling.push(`${n["@id"]} flowNodeRef → ${v}`);
    }
    expect(dangling).toEqual([]);
  });

  test("a subgraph says what it holds with bootstrap's own graph-typology individuals", () => {
    const declared = new Set((JSON.parse(readFileSync(join(BOOTSTRAP, "bootstrap.json"), "utf-8")) as { directories: { graphTypologies: string[] }[] }).directories.flatMap((d) => d.graphTypologies));
    for (const n of nodes().filter((x) => x["@type"] === "bootstrap:Subgraph")) {
      for (const t of n["type"] as string[]) expect(declared.has(t.replace("bootstrap:graphTypology/", ""))).toBe(true);
    }
  });

  test("provenance only when asked, and never on a node", () => {
    expect("generatedAtTime" in build()).toBe(false);
    const p = build(true);
    expect("generatedAtTime" in p).toBe(true);
    expect(JSON.stringify(p["@graph"])).not.toContain("generatedAtTime");
  });

  test("the document says it is generated, and by what", () => {
    expect(String(build()["comment"])).toContain(GENERATED_BY);
  });

  test("nothing the build could not read is dropped silently", () => {
    expect(build()["problems"]).toEqual([]);
  });

  test("a declared subgraph whose contents were not read is named, not left empty", () => {
    const g = build();
    const graph = g["@graph"] as { "@type": string; label: string; type: string[] }[];
    const unread = graph
      .filter((n) => n["@type"] === "bootstrap:Subgraph")
      .filter((n) => !n.type.some((k) => COLLECTED_KINDS.some((c) => k.endsWith(`/${c}`))))
      .map((n) => n.label)
      .sort();
    expect(unread.length).toBeGreaterThan(0);
    expect(g["omitted"]).toEqual(unread);
  });

  test("nodes are sorted by @id, by code unit", () => {
    const ids = (build()["@graph"] as { "@id": string }[]).map((n) => n["@id"]);
    expect(ids).toEqual([...ids].sort());
  });
});

describe("a process says what it is for, what it calls, and where it is drawn", () => {
  const processes = () => nodes().filter((n) => n["@type"] === "bootstrap:Process");

  test("every bootstrap process carries its diagram's documentation: the whole as description, the first sentence as summary", () => {
    expect(processes().length).toBe(readdirSync(join(BOOTSTRAP, "processes")).filter((f) => f.endsWith(".bpmn")).length);
    for (const p of processes()) {
      expect(typeof p["description"], p["@id"]).toBe("string");
      expect(p["summary"], p["@id"]).toBe(firstSentence(String(p["description"])));
    }
  });

  test("the processes a process calls are its call activities' calledElement, each a Process node", () => {
    const init = processes().find((p) => p["@id"].endsWith("#process/Process_InitializeHarness"))!;
    expect(init["requires"]).toEqual(
      ["Process_CompleteInitialization", "Process_Discussion", "Process_LogMessage"].map((x) => `${DOC}#process/${x}`),
    );
    const calls = nodes().filter((n) => n["type"] === "bpmn:callActivity");
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) expect(String(c["calledElement"])).toContain("#process/");
  });

  test("a process is depicted by the SVG drawn beside its .bpmn", () => {
    for (const p of processes()) expect(p["depiction"]).toBe(String(p["source"]).replace(/\.bpmn$/, ".svg"));
  });

  test("the process's own documentation, never a task's; a call to a process no diagram defines is a problem, and no link is written", () => {
    const root = mkdtempSync(join(tmpdir(), "export-graph-"));
    mkdirSync(join(root, "processes"));
    writeFileSync(join(root, "demo.json"), JSON.stringify({ name: "demo", needs: ["bootstrap"], directories: [{ id: "p", path: "processes/", graphTypologies: ["processes"] }] }));
    writeFileSync(
      join(root, "processes", "a.bpmn"),
      '<bpmn:definitions xmlns:bpmn="x"><bpmn:process id="P_A" name="A"><bpmn:task id="T"><bpmn:documentation>A task, not the process.</bpmn:documentation></bpmn:task><bpmn:documentation>Does A. Then more.</bpmn:documentation><bpmn:callActivity id="C" calledElement="P_Missing"/></bpmn:process></bpmn:definitions>',
    );
    const g = exportGraph(root, { docIri: DOC, bootstrapRoot: BOOTSTRAP });
    const graph = g["@graph"] as Node[];
    const a = graph.find((n) => n["@type"] === "bootstrap:Process")!;
    expect(a["summary"]).toBe("Does A.");
    expect(a["description"]).toBe("Does A. Then more.");
    expect("requires" in a).toBe(false);
    expect("calledElement" in graph.find((n) => n["@id"].endsWith("/node/C"))!).toBe(false);
    expect(g["problems"]).toEqual(["#process/P_A: calls #process/P_Missing, which no diagram here defines", "#process/P_A/node/C: calls #process/P_Missing, which no diagram here defines"]);
  });

  test("another instance's graph is written in bootstrap's classes, whatever it declares", () => {
    const tools = exportGraph(join(import.meta.dir, ".."), { docIri: DOC });
    const ctx = tools["@context"] as Record<string, unknown>;
    expect(ctx["bootstrap"]).toBe((build()["@context"] as Record<string, unknown>)["bootstrap"]);
    expect(tools["problems"]).toEqual([]);
    expect((tools["@graph"] as Node[]).filter((n) => n["@type"] === "bootstrap:Process").map((n) => n["summary"] !== undefined)).toEqual([true]);
  });

  test("the first sentence", () => {
    expect(firstSentence("One.  Two.")).toBe("One.");
    expect(firstSentence("A file.bpmn is\n read. Then")).toBe("A file.bpmn is read.");
    expect(firstSentence("No stop")).toBe("No stop");
    expect(firstSentence("Ends here.")).toBe("Ends here.");
  });
});

describe("the XML reader is enough for authored BPMN", () => {
  test("elements, attributes, nesting, text and entities", () => {
    const x = parseXml('<?xml version="1.0"?><!-- c --><a:r x="1"><a:c y=\'2\'/><a:t>a &amp; b</a:t></a:r>');
    const r = x.children[0]!;
    expect(r.name).toBe("a:r");
    expect(r.attrs).toEqual({ x: "1" });
    expect(r.children.map((c) => c.name)).toEqual(["a:c", "a:t"]);
    expect(r.children[1]!.text).toBe("a & b");
  });
});
