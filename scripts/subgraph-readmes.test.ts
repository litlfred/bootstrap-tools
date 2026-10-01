/**
 * `subgraph-readmes` — one README per declared directory, from the declaration.
 *
 * @module bootstrap-tools/scripts/subgraph-readmes.test
 * @graphNode none — a test
 *
 * Fixture instances in a temporary directory, resolved with bootstrap's plain
 * rule (`instancesIn`). `plan()` writes nothing. Whether every link a
 * generated README carries resolves over the REAL tree is the hosting harness's test,
 * because the real tree is resolved with the harness's Extensions.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BEGIN, END, instancesIn, plan, splice } from "./subgraph-readmes.ts";

function repo(): string {
  const r = mkdtempSync(join(tmpdir(), "subgraph-readmes-"));
  const inst = join(r, "demo");
  mkdirSync(join(inst, "skills", "pack"), { recursive: true });
  mkdirSync(join(inst, "notes"));
  mkdirSync(join(inst, "kept"));
  writeFileSync(
    join(inst, "demo.json"),
    JSON.stringify({
      name: "demo",
      title: "Demo",
      directories: [
        { id: "skills", path: "skills/", graphKinds: ["skills"], dependents: "skip", title: "Skills", description: "What to do." },
        { id: "notes", path: "notes/", graphKinds: ["skills"], dependents: "skip" },
        { id: "kept", path: "kept/", graphKinds: ["skills"], dependents: "skip", description: "Hand written." },
        { id: "gone", path: "gone/", graphKinds: ["skills"], dependents: "skip", description: "Not here." },
      ],
    }),
  );
  writeFileSync(join(inst, "README.md"), "# demo\n");
  writeFileSync(join(inst, "skills", "a.md"), "---\nname: a\ndescription: Does A. More.\n---\n");
  writeFileSync(join(inst, "skills", "pack", "b.md"), "---\nname: b\ndescription: B.\n---\n");
  writeFileSync(join(inst, "skills", "README.md"), `Intro above.\n\n${BEGIN}\nold\n${END}\n\nOutro below.\n`);
  writeFileSync(join(inst, "notes", "n.md"), "# A note\n");
  writeFileSync(join(inst, "kept", "README.md"), "# Somebody wrote this\n");
  return r;
}

describe("splice", () => {
  test("no README: a file holding only the region", () => {
    expect(splice(undefined, "x")).toBe(`${BEGIN}\nx\n${END}\n`);
  });
  test("markers: the region is replaced and the rest kept", () => {
    expect(splice(`a\n${BEGIN}\nold\n${END}\nb`, "new")).toBe(`a\n${BEGIN}\nnew\n${END}\nb`);
  });
  test("no markers: undefined, meaning leave it alone", () => {
    expect(splice("# written by a person\n", "x")).toBeUndefined();
  });
});

describe("plan, on a fixture", async () => {
  const r = repo();
  const p = await plan(r, instancesIn(r));
  const inst = join(r, "demo");
  const skills = p.writes.get(join(inst, "skills", "README.md"))!;

  test("heading and paragraph are the declared title and description", () => {
    expect(skills).toContain("# Skills");
    expect(skills).toContain("What to do.");
    expect(skills).toContain("Part of [Demo](../README.md), declared as `skills`, holding `skills`.");
  });

  test("the text around the markers survives", () => {
    expect(skills.startsWith("Intro above.")).toBe(true);
    expect(skills).toContain("Outro below.");
    expect(skills).not.toContain("\nold\n");
  });

  test("files are described from themselves; a subdirectory is one row with its count", () => {
    expect(skills).toContain("| [`a.md`](a.md) | Does A. |");
    expect(skills).toContain("| [`pack/`](pack/) | 1 file | |");
  });

  test("a missing README is created; the heading falls back to the id", () => {
    const notes = p.writes.get(join(inst, "notes", "README.md"))!;
    expect(notes.startsWith(BEGIN)).toBe(true);
    expect(notes).toContain("# notes");
    expect(notes).toContain("_No description is declared for `notes`._");
  });

  test("every gap is a finding, and a hand-written README is left untouched", () => {
    expect(p.writes.has(join(inst, "kept", "README.md"))).toBe(false);
    const ids = (k: keyof typeof p.findings) => p.findings[k].map((f) => f.directory).sort();
    expect(ids("no-title")).toEqual(["kept", "notes"]);
    expect(ids("no-description")).toEqual(["notes"]);
    expect(ids("absent-directory")).toEqual(["gone"]);
    expect(ids("unmarked-readme")).toEqual(["kept"]);
  });

  test("nothing was written by planning", () => {
    expect(readFileSync(join(inst, "skills", "README.md"), "utf-8")).toContain("\nold\n");
    expect(existsSync(join(inst, "notes", "README.md"))).toBe(false);
    rmSync(r, { recursive: true, force: true });
  });
});

describe("a subdirectory row says what it IS when the caller resolved one", async () => {
  // Bean `kgho` / folio-assistant#1724. A file COUNT is re-derived from the
  // filesystem on every run, so two branches that each add a file compute two
  // different totals and NEITHER is right for the merge: one line of
  // `beans/README.md` conflicted three times in a single day (2026-10-01).
  // A declared description changes only when the declaration changes.
  //
  // The caller resolves it, not this writer. `declarationFileIn` recognises a
  // declaration by `name` matching its basename, and that is load-bearing:
  // `bootstrap-tools/` holds both `package.json` and `bootstrap-tools.json`,
  // BOTH satisfy `KnowledgeGraphDeclarationSchema`, and the function throws on
  // two — so a "whatever validates" rule would throw on this very repository.
  // Declarations that legitimately break the basename rule (`beans/beans.json`,
  // whose `name` says whose work plan it is) are their harness's to resolve.
  const r = repo();
  const withDesc = instancesIn(r).map((i) => ({
    ...i,
    dirs: i.dirs.map((d) => (d.id === "skills" ? { ...d, subdirs: { pack: "A bundle of related skills." } } : d)),
  }));
  const p = await plan(r, withDesc);
  const skills = p.writes.get(join(r, "demo", "skills", "README.md"))!;

  test("the description replaces the count", () => {
    expect(skills).toContain("| [`pack/`](pack/) | A bundle of related skills. | |");
  });

  test("and the count is GONE, not merely accompanied", () => {
    // The row carries one answer. Printing both would make a reader ask which
    // is the subject of the row, and reintroduce the drifting value this
    // change exists to remove.
    expect(skills).not.toContain("1 file");
  });

  test("a name with no description still gets its count", () => {
    // Partial resolution is the normal case: a directory may declare some of
    // its children and not others. The unnamed ones must not go blank.
    const partial = instancesIn(r).map((i) => ({
      ...i,
      dirs: i.dirs.map((d) => (d.id === "skills" ? { ...d, subdirs: { nothing: "unrelated" } } : d)),
    }));
    return plan(r, partial).then((q) => {
      expect(q.writes.get(join(r, "demo", "skills", "README.md"))!).toContain("| [`pack/`](pack/) | 1 file | |");
    });
  });

  test("an empty string is not a description — it falls back", () => {
    // `""` is what the writer itself passes down for "nothing declared", so a
    // caller supplying it must behave the same way rather than emitting a
    // blank cell.
    const blank = instancesIn(r).map((i) => ({
      ...i,
      dirs: i.dirs.map((d) => (d.id === "skills" ? { ...d, subdirs: { pack: "" } } : d)),
    }));
    return plan(r, blank).then((q) => {
      expect(q.writes.get(join(r, "demo", "skills", "README.md"))!).toContain("| [`pack/`](pack/) | 1 file | |");
    });
  });
});
