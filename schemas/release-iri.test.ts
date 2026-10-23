/**
 * An instance's release addresses, and the sync that keeps literal copies of
 * them at the declared major (owner, 2026-10-23, option "B. Major in
 * address": every address carries the major only; the pin fixes the release).
 */
import { describe, expect, test } from "bun:test";

import { bootstrapRelease, legacyExactSemver, releaseIri, releaseIris, tagCompatible, withLegacyMoved } from "./release-iri";
import { rewrite } from "../scripts/iri-sync";

const R = releaseIris({ iriBase: "https://example.org/kg/", version: "2.3.4" })!;

describe("releaseIris", () => {
  test("agents and people both read the major; the full version is in no address", () => {
    expect(R.agent).toBe("https://example.org/kg/v2/");
    expect(R.human).toBe("https://example.org/kg/v2/");
    expect(R.version).toBe("2.3.4");
    expect(releaseIri(R, "schemas/x.schema.json", "agent")).toBe("https://example.org/kg/v2/schemas/x.schema.json");
    expect(releaseIri(R, "/guide.html", "human")).toBe("https://example.org/kg/v2/guide.html");
  });

  test("no iriBase is no release; an iriBase without a semver version is refused", () => {
    expect(releaseIris({ version: "1.0.0" })).toBeUndefined();
    expect(() => releaseIris({ iriBase: "https://example.org/kg/", version: "v1" })).toThrow();
    expect(() => releaseIris({ iriBase: "https://example.org/kg/" })).toThrow();
  });

  test("bootstrap declares one, at the address its own repository owns", () => {
    const b = bootstrapRelease();
    expect(b.iriBase).toBe("https://litlfred.github.io/bootstrap/");
    expect(b.agent).toBe(`${b.iriBase}v${b.major}/`);
    expect(b.agent).not.toContain(b.version);
  });
});

describe("tagCompatible — semver within one major", () => {
  test("same major reads, another major does not", () => {
    expect(tagCompatible("model-registry/1.9.0", "model-registry", 1)).toBe(true);
    expect(tagCompatible("model-registry/2.0.0", "model-registry", 1)).toBe(false);
    expect(tagCompatible("model-registry/v1", "model-registry", 1)).toBe(false);
    expect(tagCompatible("other/1.0.0", "model-registry", 1)).toBe(false);
  });
});

describe("iri-sync rewrite", () => {
  test("every full version — the declared one too — and a stale major move to the declared major; the current major stays", () => {
    const text = [
      'xmlns:a="https://example.org/kg/2.3.3/ns#"',
      'href="https://example.org/kg/v1/guide.html"',
      'declared="https://example.org/kg/2.3.4/ns#"',
      'current="https://example.org/kg/v2/schemas/x.schema.json"',
    ].join("\n");
    const r = rewrite(text, R);
    expect(r.changes).toBe(3);
    expect(r.text).toBe(
      [
        'xmlns:a="https://example.org/kg/v2/ns#"',
        'href="https://example.org/kg/v2/guide.html"',
        'declared="https://example.org/kg/v2/ns#"',
        'current="https://example.org/kg/v2/schemas/x.schema.json"',
      ].join("\n"),
    );
  });

  test("a tree already at the major is left alone, so --check passes on it", () => {
    const text = 'a="https://example.org/kg/v2/ns#" b="https://example.org/kg/v2/"';
    expect(rewrite(text, R)).toEqual({ text, changes: 0, legacy: 0 });
  });

  test("--from moves an old base's identifiers, and leaves the bare base alone", () => {
    const r = rewrite('a="https://old.example/b/processes/ns#x" b="https://old.example/b/"', R, "https://old.example/b/");
    expect(r.text).toBe('a="https://example.org/kg/v2/processes/ns#x" b="https://old.example/b/"');
    expect(r.changes).toBe(1);
  });

  test("another base is never touched", () => {
    const text = 'x="https://example.org/other/1.0.0/ns#"';
    expect(rewrite(text, R)).toEqual({ text, changes: 0, legacy: 0 });
  });
});

// TRANSITION (bootstrap-tools#39): remove with the tolerance.
describe("legacy exact-semver addresses — tolerated as deprecated for one release", () => {
  test("only a full version of the DECLARED major is legacy; another major is not", () => {
    expect(legacyExactSemver(R, "https://example.org/kg/2.0.1/ns#x")).toBe("https://example.org/kg/2.0.1/");
    expect(legacyExactSemver(R, "https://example.org/kg/1.9.9/ns#x")).toBeUndefined();
    expect(legacyExactSemver(R, "https://example.org/kg/v2/ns#x")).toBeUndefined();
    expect(legacyExactSemver(R, "https://example.org/other/2.0.0/ns#x")).toBeUndefined();
  });

  test("a checker's view moves only the same-major copies, and counts them", () => {
    const text = 'a="https://example.org/kg/2.3.3/ns#" b="https://example.org/kg/1.0.0/ns#" c="https://example.org/kg/v2/x"';
    expect(withLegacyMoved(text, R)).toEqual({
      text: 'a="https://example.org/kg/v2/ns#" b="https://example.org/kg/1.0.0/ns#" c="https://example.org/kg/v2/x"',
      count: 1,
    });
  });

  test("iri-sync's rewrite still MOVES every full version, and says which were legacy (warned) and which stale (failed)", () => {
    const r = rewrite('a="https://example.org/kg/2.3.3/ns#" b="https://example.org/kg/1.0.0/ns#"', R);
    expect(r.text).toBe('a="https://example.org/kg/v2/ns#" b="https://example.org/kg/v2/ns#"');
    expect(r.changes).toBe(2);
    expect(r.legacy).toBe(1); // the 2.3.3 copy: a warning under --check
    expect(r.changes - r.legacy).toBe(1); // the 1.0.0 copy: another major, a failure under --check
  });
});

describe("a toolset supports content by major version", () => {
  test("listed majors are supported, others refused; no range syntax", async () => {
    const { supportsContent } = await import("./declaration.ts");
    const tools = { supports: { bootstrap: [0, 2] } };
    expect(supportsContent(tools, "bootstrap", "0.9.1")).toBe(true);
    expect(supportsContent(tools, "bootstrap", "2.0.0")).toBe(true);
    expect(supportsContent(tools, "bootstrap", "1.0.0")).toBe(false);
    expect(supportsContent(tools, "other", "0.1.0")).toBe(false);
    expect(supportsContent({}, "bootstrap", "0.1.0")).toBe(false);
  });
});
