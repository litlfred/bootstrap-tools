# bootstrap-tools

**The toolset that describes [`bootstrap`](https://github.com/litlfred/bootstrap), kept outside it so bootstrap does not have one.**

Bootstrap is a content Knowledge Graph: files to read (`.md`, `.json`, `.bpmn`) and nothing to run. Its README promises an agent that it needs nothing installed. So the code that writes bootstrap's schemas and checks its content lives here, beside it, and bootstrap never imports from here.

It is **one** toolset over swappable content. Someone who wants a different generator, visualiser or checker uses a different toolset against the same bootstrap.

**Contents**

<!-- kg:toc:begin -->

- [What is here](#what-is-here)
- [Running it](#running-it)
- [The site](#the-site)
- [Status](#status)

<!-- kg:toc:end -->

## What is here

| path | what it is |
|---|---|
| `schemas/graph.ts` | bootstrap's defined terms, in order, with what each uses and the schema that defines it; its graph kinds; the declaration shape |
| `schemas/discussion.ts`, `requirement.ts`, `model-registry.ts`, `glossary-ledger.ts` | the Zod source of the other schemas bootstrap publishes |
| `schemas/declaration.ts` | reads a Knowledge Graph declaration with bootstrap's own shape |
| `schemas/release-iri.ts` | an instance's release addresses: `<iriBase><version>/` for programs, `<iriBase>v<major>/` for people |
| `schemas/declared-order.ts` | checks that an authored order keeps its promise: each item uses only items above it |
| `scripts/gen-bootstrap-schemas.ts` | writes `bootstrap/schemas/*.schema.json` and the drawn page `bootstrap/schemas/README.md` |
| `scripts/gen-vocabulary.ts` | writes `bootstrap/ns.jsonld`, bootstrap's vocabulary: every defined term and graph kind, as RDF and SKOS, at the address its IRIs name |
| `scripts/export-graph.ts`, `schemas/graph-export.ts` | writes `bootstrap.jsonld`, bootstrap's own graph, in bootstrap's classes and standard properties (Dublin Core, BPMN, PROV); the site publishes it, nothing commits it |
| `scripts/publish-files.ts` | publishes bootstrap's files as they sit at its site address, never overwriting; GitHub Pages renders the `.md` |
| `scripts/rehearse-standalone.ts` | runs these tools' checks and tests with bootstrap and bootstrap-tools copied alone as sibling clones — the split, rehearsed |
| `scripts/iri-sync.ts` | keeps every literal release IRI at the declared version |
| `scripts/term-links.ts` | links each defined term in README prose to its definition |
| `scripts/subgraph-readmes.ts`, `scripts/templates/readme/` | writes each declared directory's README from its declaration, through Liquid templates; standalone it writes only the graphs these tools `support` |
| `scripts/readme-graph-sections.ts` | the `kg:processes`, `kg:files` and `kg:roles` README sections: every Process drawn, every file described from itself, every Role with all its names |
| `scripts/readme-toc.ts` | the `kg:toc` README section: a README's own level-2 and level-3 headings, linked by GitHub's anchors, outside code and outside its own region |
| `scripts/readme-sections.ts` | writes (or with `--check`, verifies) every section a README opts into by its marker pair; `--root` names the instance |
| `scripts/readme-book.ts` | every README in a repository as one page: the root's first, then each directory's by path, with a table of contents, headings demoted per section and relative links rewritten; `--check` fails on any link on the page that would not land |
| `scripts/site.ts` | stages an instance's GitHub Pages site. First every JSON Schema and JSON-LD document at the IRI it names (`$id` / `@id` under `iriBase`, an extensionless one included, with a `.json` copy beside each JSON-LD), and for bootstrap its graph. Then its files as they sit, also under `<version>/`, and the README page as `index.md`, ending in a "Published documents" list. `--check` stages into a temporary directory and lists every address |
| `scripts/init.ts` | walks an instance's initialization steps as its declarations name them. PRIMARY and first: `schemas:staged` and `schemas:published`, the JSON Schemas and JSON-LD at their IRIs. Then directories, assets, the README and its sections, needed harnesses' instructions and the Pages site. It performs what a tool can (switching Pages on needs an authenticated `gh`) and reports each as done, not done, could not determine, or stated. A 404 is not done; a 403, 407, 5xx or no answer could not be determined |
| `scripts/render-bpmn.ts` | draws each Process as an SVG beside its `.bpmn`, with bpmn-js in headless Chromium; the harness's site renderer uses the same drawing |
| `scripts/git-files.ts` | the files git accounts for — tracked, plus untracked and not ignored |
| `scripts/check-closure.ts` | fails if anything here imports beyond itself, `zod`, `liquidjs`, `@playwright/test` and the runtime |
| `scripts/check-node-iris.ts` | fails if a published node's identifier is not its file's path |
| `scripts/check-bootstrap-concepts.ts` | checks bootstrap's requirement concepts |

## Running it

Every tool is a script an agent runs, as the actor in a process step, or a person runs by hand. None needs a service.

```sh
bun run --cwd bootstrap-tools schemas          # regenerate bootstrap's schemas and schema page
bun run --cwd bootstrap-tools readmes          # regenerate bootstrap's directory READMEs
bun run --cwd bootstrap-tools render           # redraw each Process beside its .bpmn
bun run --cwd bootstrap-tools vocabulary       # regenerate bootstrap/ns.jsonld
bun run --cwd bootstrap-tools graph -- --root ../bootstrap --base-url <site>/bootstrap/ --out bootstrap.jsonld
bun run --cwd bootstrap-tools schemas:check    # fail if they are stale
bun run --cwd bootstrap-tools check:closure    # nothing here imports above bootstrap
bun run --cwd bootstrap-tools check:node-iris  # every published identifier is its file's path
bun run --cwd bootstrap-tools test
bun run --cwd bootstrap-tools readme-sections -- --root ../bootstrap   # README sections, the TOC among them
bun run --cwd bootstrap-tools book -- --root ../bootstrap --check      # the one-page README: every link lands
bun run --cwd bootstrap-tools site -- --root ../bootstrap --out ../_site-src
bun run --cwd bootstrap-tools init -- --root ../bootstrap              # every initialization step, checked; --dry-run to only check
```

## The site

The site is how a harness's JSON Schemas and JSON-LD reach the IRIs they
name, which is the primary initialization step; the README page rides along.
bootstrap-tools itself declares no `iriBase` and publishes no JSON Schema of
its own (its schemas are the Zod that bootstrap's are generated from), so its
site carries only its README page and files.

Each repository's `.github/workflows/pages.yml` (bootstrap's, and this
one's) checks out the instance and these tools side by side, runs
`site.ts`, builds the staged directory with Jekyll and deploys it to GitHub
Pages. Pages has to be on, with **Source: GitHub Actions**, for the deploy
to be accepted: `init.ts` switches it on when an authenticated `gh` is
present, and otherwise prints the one step for a person, at
`https://github.com/<owner>/<repo>/settings/pages`. It never reports an
unchecked step as done.

In this repository the same commands are also root scripts (`bootstrap:schemas`, `check:tools-closure`, `check:node-iris`, `iri:sync`) and run in the gate set.

## Status

Staged here as a sibling directory until `litlfred/bootstrap-tools` gets its first commit. The package is `private` until its first release; removing that is part of the release step. Bean `xsqm`.
