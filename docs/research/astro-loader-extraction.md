# Astro loader / collection-location extraction

**Date:** 2026-09-23  
**Status:** exploration only (branch `explore/schema-first-overlay`). **Not** map authority. Does **not** update GitHub [#1](https://github.com/bbtgnn/astro-dev-cms-gui/issues/1) or ADRs.  
**Parent:** [schema-first-overlay.md](./schema-first-overlay.md)  
**Question:** How can Astro Dev CMS extract **collection location metadata** (loader kind, `glob`/`file` `base`, pattern, entry path mapping) from a consumer Astro project’s content collections — without making authors re-declare folders in CMS config?  
**Method:** Primary sources only — Astro docs (MCP / docs.astro.build), installed Astro 7.3.3 package source under `node_modules`, sibling `astro-decap-github-connect` stamp/proxy code + ADR, in-repo ADRs and `@cms/astro`. Runtime probe of `glob()` / `file()` return shapes in the reference host demos (originally probed under the former `@cms/astro-template`; now `@cms/astro-demo-simple` / `@cms/astro-demo`).  
**Honesty bar:** Prefer what Astro’s public types and returned objects actually expose. Do not invent an official “list loaders” integration API. Prior art from zod-decap is real but is a **private intercept**, not Astro-supported introspection.

**Process:** This note does **not** edit AGENTS.md, CONTEXT.md, ADRs, or map issue #1.

---

## Product fit (context only)

Spike direction ([schema-first-overlay.md](./schema-first-overlay.md)):

| Layer | Authority |
| --- | --- |
| Validation | User’s Astro / Standard Schema **Input** |
| Loaders / paths | Stay where Astro requires them (`content.config` / `defineCollection`) |
| CMS editor config | Presentation-only; **host joins** schema + location |
| Browser | Must **not** import `content.config` ([ADR-0008](../adr/0008-backend-agnostic-ui-fs-first-adapter.md), [ADR-0004](../adr/0004-live-content-config-discovery.md)) |

**Contrast (current product law):** [ADR-0019](../adr/0019-cms-first-semantic-schema.md) makes a CMS unified tree the human source and **generates** `content.config.ts`, so loader `base` / `pattern` already live in IR (`packages/astro/src/generate/emit-content-config.ts`, `build-default-fs-host.ts`). Schema-first flips that: location must be **discovered** from Astro’s graph instead of authored twice.

**Id ↔ path today:** FS adapter treats protocol `id` as opaque to the UI; maps under loader base (`docs/intro` ↔ `<base>/docs/intro.json`) — [ADR-0007](../adr/0007-entry-id-path-conventions.md). Extraction must feed that host mapping, not leak paths into the authoring UI.

**Non-Astro seam (out of scope for *Astro* extraction):** Fattura-style hosts need a different location API (`{ schema, location }` / app-data keyspace). Do not force `glob`-shaped location onto the portable editor face. Parent spike already locks this split ([schema-first-overlay.md](./schema-first-overlay.md) § “Non-Astro”).

---

## Findings by question

### 1. What does `defineCollection` return / expose at runtime?

**Docs:** `defineCollection` is typed `(input: CollectionConfig) => CollectionConfig` — an identity-shaped configurator. Collections are registered by exporting `collections` from `src/content.config.*`. Source: [Content Collections API — `defineCollection()`](https://docs.astro.build/en/reference/modules/astro-content/#definecollection).

**Source (Astro):** `defineCollection(config)` validates importer / loader shape, sets `type` to content-layer when a `loader` is present, then **`return config`**. Same for `defineLiveCollection`. Sources: `astro/dist/content/config.js` (`defineCollection`), upstream [`packages/astro/src/content/config.ts`](https://github.com/withastro/astro/blob/main/packages/astro/src/content/config.ts).

**Implication:** After `const blog = defineCollection({ loader, schema })`, the value **does** expose `.loader` and `.schema` (and `.type`). You can read them from `export const collections` if you can load that module on the **host/Node** side.

**What you do *not* get for free:** location inputs (`base`, `pattern`, `fileName`) are **not** properties of `CollectionConfig` beyond the opaque `loader` object — see Q2.

### 2. `glob()` / `file()` — public inputs vs introspectable outputs

**Public call inputs (docs):**

| Loader | Inputs | Docs |
| --- | --- | --- |
| `glob(options)` | `pattern` (required); `base?` (`string \| URL`, default `"."`); `generateId?`; `retainBody?`; `deferRender?` | [glob loader](https://docs.astro.build/en/reference/content-loader-reference/#glob-loader) |
| `file(fileName, options?)` | `fileName` (path relative to project root); optional `parser` | [file loader](https://docs.astro.build/en/reference/content-loader-reference/#file-loader) |

**Public `Loader` object (docs + types):** only `name`, `load`, and optional `schema` / `createSchema`. Source: [Object loader API](https://docs.astro.build/en/reference/content-loader-reference/#object-loader-api); `astro/dist/content/loaders/types.d.ts` (`export type Loader = { name; load; … }`).

**Implementation:** `glob()` closes over `globOptions` inside `load` and returns `{ name: "glob-loader", load }`. `file()` closes over `fileName` / parser and returns `{ name: "file-loader", load }`. No `base` / `pattern` / `fileName` fields are assigned on the returned object. Sources: `astro/dist/content/loaders/glob.js`, `file.js`; upstream [`glob.ts`](https://github.com/withastro/astro/blob/main/packages/astro/src/content/loaders/glob.ts).

**Runtime probe (Astro 7.3.3 via reference host demos):**

```text
glob keys: ["name", "load"]  name: "glob-loader"  base/pattern: absent
file keys: ["name", "load"]  name: "file-loader"  fileName: absent
```

**Verdict:** **Call-time only.** Kind can be weakly guessed from `loader.name` (`glob-loader` / `file-loader`), but **`base` / `pattern` / `fileName` are not introspectable** after construction without capturing them at the call boundary (stamp/proxy) or parsing source.

Sibling ADR states the same conclusion: “Loader `base`/`pattern` are not on Astro’s public loader object” — `astro-decap-github-connect/docs/adr/0001-content-config-registry-and-boot-proxies.md`.

### 3. Official Astro integration / Content Layer APIs?

| Mechanism | What it does | Location metadata? |
| --- | --- | --- |
| `astro:config:setup` | Vite plugins, routes, middleware, `updateConfig` | **No** collections / loaders API. Source: [Integrations — `astro:config:setup`](https://docs.astro.build/en/reference/integrations-reference/#astroconfigsetup) |
| `astro:server:setup` → `refreshContent({ loaders?, context? })` | Re-run content sync for named loaders in dev | Triggers load; does **not** expose loader options. Source: [`refreshContent`](https://docs.astro.build/en/reference/integrations-reference/#refreshcontent-option) |
| Internal `loadContentConfig` | Vite environment `import` of `src/content.config.*`, parse `collections` | Yields schemas + opaque `Loader` objects (`name`/`load` only). Source: `astro/dist/content/utils.js` (`loadContentConfig`, `contentConfigParser`) |
| Data store entries | After sync, entries may carry `filePath` relative to project root | Useful for *existing* files; weak for **create** path templates / `base`+`pattern` without reverse-engineering. Docs: [`CollectionEntry.filePath`](https://docs.astro.build/en/reference/modules/astro-content/#collectionentryfilepath) |

**Verdict:** No supported public hook to “list collections + loader config (base/pattern)” at setup. Astro loads content config internally for the Content Layer; that path is not a stable CMS integration surface.

### 4. Import graph: `cms.config` → `content.config`

**Idea:** `cms.config.ts` imports `./content.config` so the registry is `Record<string, ReturnType<typeof defineCollection>>`, and the host reads `.schema` / stamped `.loader`.

| Concern | Assessment |
| --- | --- |
| Runtime shape | Works for `.schema` + `.loader` **object** (Q1). Still needs stamps for location (Q2). |
| Circular imports | Risk if `content.config` (or shared schema) imports CMS modules that import content config. Spike’s safer pattern is **shared schema module** imported by both, not CMS owning content config as typing source ([schema-first-overlay.md](./schema-first-overlay.md)). |
| Second importer of `content.config` | Astro itself loads it via Content Layer (`environment.runner.import`). A second host-side import (Vite SSR / esbuild bundle) is what zod-decap does successfully — but it is **not** documented as a supported dual-consumer contract. Source: `loadContentConfig` in `astro/dist/content/utils.js`; zod-decap `import-bundled-content-config.ts`. |
| `defineCollection` importer check | Stack-based: rejects call from `live.config`; otherwise passes through. Does **not** forbid a second importer of an already-defined collections export. Source: `getImporterFilename` / `defineCollection` in `astro/dist/content/config.js`. |
| Vite / `astro:content` | `content.config` imports virtual `astro:content`. Host load must resolve that module (Vite graph or emit shims). Browser must never be that second importer — [ADR-0004](../adr/0004-live-content-config-discovery.md), [ADR-0008](../adr/0008-backend-agnostic-ui-fs-first-adapter.md). |
| Current `@cms/astro` | Product `cms()` has **no** options (`CmsIntegrationOptions = Record<string, never>`); generates content config from IR instead of reading it. Sources: `packages/astro/src/integration.ts`, [ADR-0019](../adr/0019-cms-first-semantic-schema.md). |

**Verdict:** Importing `content.config` into CMS config is viable as a **host registry edge** for schemas + stamped loaders, but it is not sufficient alone for location, and it must stay off the browser graph.

### 5. Hook / proxy / alternative mechanisms

#### A. Vite alias + proxy wrapping `astro/loaders` (+ optional `astro:content`) — zod-decap boot

**How:** Alias `astro/loaders` → shim that calls real `glob`/`file`, then `stampLoader` with `{ kind, pattern, base }` / `{ kind, fileName }` on `Symbol.for(...)`. Parallel Vite plugin wraps `astro:content` to stamp `reference` / function-schema `image`. Sources: `astro-decap-github-connect/packages/zod-decap-local/src/content-proxy/boot.ts`, `shims/astro-loaders.ts`, `stamps.ts`; sibling `docs/adr/0001-content-config-registry-and-boot-proxies.md`.

**Gets:** Exact call-time location metadata on every stamped built-in loader; same boot path can recover image/ref kinds (parent spike needs both).

**Reliability:** High for projects that import `glob`/`file` from `astro/loaders` (the documented path). Breaks / no stamp if someone re-exports loaders from a local wrapper that bypasses the alias, or uses a custom loader.

**Host-only?** Yes if stamps are read only in Node/host (integration, FS adapter, emit). Browser virtuals must not import content config.

**Drawbacks:** Private intercept of Astro internals; must keep shim in sync with Astro major versions; enforce `pre` plugin / alias order so content.config evaluates through the proxy.

#### B. Bundle + rewrite `content.config` outside Vite (zod-decap emit)

**How:** esbuild bundles `content.config`, rewriting `astro:content` / `astro/loaders` to the same stamp shims; dynamic-import the outfile; read `collections` + stamps. Source: `import-bundled-content-config.ts`, `load-content-config.ts`.

**Gets:** Same stamped metadata **without** a running Vite server (CLI, CI, offline generate).

**Reliability:** High for Node-loadable configs; fails on browser-only or non-bundlable side effects in content.config.

**Host-only?** Yes by design.

**Drawbacks:** Dual graphs (boot Vite + emit esbuild) to maintain; cache/temp files under `node_modules/.cache`.

#### C. Parse `content.config` as AST

**How:** ts-morph / Babel walk `glob({ base, pattern })` call sites.

**Gets:** Literals only; loses computed bases, imported constants, spread options, custom loaders.

**Reliability:** Low / fragile — sibling ADR explicitly rejected “closure/AST scraping as the source of truth.”

**Host-only?** Yes.

**Drawbacks:** False confidence; high maintenance.

#### D. Official Astro APIs

**None** for location introspection (Q3). Watching for future Content Layer APIs is fine; do not block the spike on them.

#### E. Pass collections / location into `cms()` / `defineCms`

**How:** Explicit `cms({ collections })` or parent’s `defineCms(collections, overlay)` where `collections` is either Astro’s export or `{ schema, location }` pairs.

**Gets:** Guaranteed location without introspection when the user (or shared module) provides it.

**Reliability:** Highest for correctness; weakest against the “do not re-declare folders” goal unless the **same** object from `content.config` is passed through (still needs stamps on that object’s loaders).

**Host-only?** Location join stays on host; schemas may be projected to the browser via virtuals (not live `content.config`).

**Drawbacks:** Easy to drift into dual declaration; API surface grows. Still the right **escape hatch** for custom loaders and for non-Astro hosts.

#### F. Infer location from Content Layer data store / `filePath`

**How:** After sync, read entry `filePath`s and reverse-engineer a common base.

**Gets:** Approximate folder for existing entries.

**Reliability:** Poor for empty collections, `file()` multi-entry single file, custom `generateId`, and **create** path templates (ADR-0007 needs a stable base + extension rules up front).

**Host-only?** Yes.

**Drawbacks:** Heuristic; not a substitute for loader options.

---

## Comparison table

| Mechanism | What you get | Reliability | Host-only? | Drawbacks |
| --- | --- | --- | --- | --- |
| Read `collections[name].schema` / `.loader` after `defineCollection` | Schema + opaque loader (`name`/`load`) | High for those fields | Must be | No `base`/`pattern`/`fileName` |
| Guess kind from `loader.name` (`glob-loader` / `file-loader`) | Weak kind only | Medium (names could change) | Yes | No paths |
| Vite alias stamp `astro/loaders` | Kind + base/pattern or fileName | High for stock loaders | Yes | Intercept maintenance; bypass risk |
| Vite/`astro:content` stamp `image`/`reference` | Kind recovery for forms | High when function-schema / `reference` used | Yes | Same intercept cost; structural detect still needed as fallback |
| esbuild bundle+rewrite content.config | Same stamps offline | High for Node configs | Yes | Second toolchain |
| AST scrape content.config | Literal call args | Low | Yes | Fragile; rejected by sibling ADR |
| Official integration hook | — | N/A | — | Does not exist today |
| Pass collections into `cms()` / explicit location | Whatever the host is given | Highest if authored | Yes | Re-declaration / drift unless shared object |
| Infer from store `filePath` | Approximate folder | Low for create / empty | Yes | Heuristic only |

---

## Image / ref stamping (secondary)

Parent spike needs **location and kind**. The same boot/emit intercept path that stamps loaders also wraps `astro:content`:

- Boot: Vite plugin virtualizes `astro:content`, wraps `reference` and function-schema `image` (`boot.ts`).
- Emit: shim `reference` + materialize `image()` via image-bridge (`shims/astro-content.ts`, `load-content-config.ts`).

**Implication for this spike:** Prefer one **Astro content-proxy** capability in `@cms/astro` that covers loader location + image/ref meta, rather than inventing a separate location-only AST path. Persist stamps are still a **CMS overlay injected at load**, not a second user-authored IR ([schema-first-overlay.md](./schema-first-overlay.md)).

Plain `z.string()` image fields remain ambiguous without explicit meta — stamp-first does not solve that alone.

---

## Recommendation (ranked for this spike)

### 1. Preferred: host-side content-proxy stamps (Vite boot + optional emit bundle)

Reuse the zod-decap pattern inside `@cms/astro`:

1. At `astro:config:setup`, install Vite alias for `astro/loaders` + optional `astro:content` proxy **before** Content Layer evaluates `content.config`.
2. Host (default FS host / middleware assembly) loads collections from stamped `content.config` (Vite SSR import **or** esbuild emit for CLI) and reads `LOADER_STAMP` (or equivalent `Symbol.for`).
3. Map stamps → collection location descriptors for ADR-0007 write bases / allowPaths (today’s IR path in `build-default-fs-host.ts` becomes “location from stamps + schema from user’s Zod”).
4. Keep all of this off the browser graph (ADR-0004 / 0008).

**Why first:** Only approach that recovers exact `base`/`pattern` without re-declaring folders; proven in sibling; shares machinery with image/ref kind recovery the spike already wants.

### 2. Preferred companion: explicit location escape + non-Astro seam

- Custom loaders, missing stamps, or advanced layouts: allow `collectionOptions`-style overrides or pass `{ schema, location }` into the host join.
- Non-Astro (Fattura): **different** location API — do not require `@cms/astro` stamps.

**Why second:** Honesty about coverage limits; keeps portable core clean.

### Deprioritize for v1 of the spike

- AST scraping as source of truth.
- Waiting on an official Astro “list loader options” API.
- Inferring create paths solely from data-store `filePath`.
- Browser import of `content.config` (forbidden by layer ADR).

### Import-only `cms.config` → `content.config` without stamps

Useful as a **schema registry** edge, insufficient for location. Prefer shared schema modules + host load of stamped content config over teaching users that CMS config must import content config for typing alone (parent spike already leans that way).

---

## Open questions / spike experiments

1. **Boot order:** Can `@cms/astro`’s Vite alias reliably wrap `astro/loaders` before Astro’s Content Layer first-imports `content.config` across `dev` / `sync` / `build`? (Probe with a fixture that logs stamp presence on first sync.)
2. **Dual load:** Prefer Vite SSR import of stamped content.config at runtime vs always using esbuild emit for host descriptors? Measure restart / HMR cost when content.config changes.
3. **Custom `generateId`:** Stamp cannot serialize the callback; document that id↔path for non-default slug rules may need overrides (ADR-0007 still owns mapping).
4. **`file()` collections:** Multi-entry single JSON — location is a file, not a folder; confirm Writer / list/create UX for that shape (product often assumes glob+JSON today).
5. **Custom / third-party loaders:** No stock stamp; require explicit location or treat as non-editable.
6. **Circular graph:** Fixture where shared schemas are imported by both configs; ensure CMS virtuals never pull `astro:content` into the browser bundle.
7. **Astro version matrix:** Stamps against Astro 5.x vs 7.x loader export paths (`dist/content/loaders/index.js` resolve strategy in zod-decap shims).
8. **Non-Astro follow-up:** Draft `{ schema, location }` host join API after this note (parent research item 2) — out of scope here beyond the seam reminder.

---

## Explicit non-actions

- Does **not** update GitHub map issue #1.  
- Does **not** supersede or edit ADRs (esp. [0019](../adr/0019-cms-first-semantic-schema.md) remains current product law until an explicit ADR).  
- Does **not** implement product code — research only.

---

## Source index (primary)

| Claim area | Source |
| --- | --- |
| `defineCollection` identity return | [docs.astro.build — defineCollection](https://docs.astro.build/en/reference/modules/astro-content/#definecollection); `astro/dist/content/config.js` |
| Loader public shape | [Object loader API](https://docs.astro.build/en/reference/content-loader-reference/#object-loader-api); `loaders/types.d.ts` |
| `glob` / `file` options | [glob](https://docs.astro.build/en/reference/content-loader-reference/#glob-loader), [file](https://docs.astro.build/en/reference/content-loader-reference/#file-loader); `loaders/glob.js`, `file.js` |
| Runtime: no base on loader object | Probe in reference host demos against Astro 7.3.3 |
| Integration hooks | [astro:config:setup](https://docs.astro.build/en/reference/integrations-reference/#astroconfigsetup), [refreshContent](https://docs.astro.build/en/reference/integrations-reference/#refreshcontent-option) |
| Internal content config load | `astro/dist/content/utils.js` (`loadContentConfig`) |
| Sibling stamp/proxy | `astro-decap-github-connect` content-proxy + sibling ADR-0001 |
| Layer / browser edge | [ADR-0004](../adr/0004-live-content-config-discovery.md), [ADR-0008](../adr/0008-backend-agnostic-ui-fs-first-adapter.md) |
| Id ↔ path | [ADR-0007](../adr/0007-entry-id-path-conventions.md) |
| Current opposite bet | [ADR-0019](../adr/0019-cms-first-semantic-schema.md); `packages/astro` generate + `build-default-fs-host.ts` |
| Spike framing | [schema-first-overlay.md](./schema-first-overlay.md) |
