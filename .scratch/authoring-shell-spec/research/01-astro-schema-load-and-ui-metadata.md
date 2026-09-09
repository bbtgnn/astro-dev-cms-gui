# Astro schema load and UI metadata (dev-time)

Research for [Astro schema load and UI metadata](../issues/01-astro-schema-load-and-ui-metadata.md). Domain terms: **authoring shell**, **field schema**, **collection**, **write-back** (see `CONTEXT.md`).

Scope: Astro Content Layer / content collections as of current mainline docs and `withastro/astro` source. Prefer primary docs and source; no product lock beyond what those support.

## Verdict

1. At **dev time**, Astro discovers `src/content.config.{ts,js,mjs,mts}`, Vite-imports it via the SSR/astro environment runner, Zod-parses the exported `{ collections }` object, and keeps it on a global observer. The Content Layer syncs loaders and validates each entry with `schema.safeParseAsync`. Config file changes invalidate via digest and re-sync.
2. A **field schema** can carry UI metadata **beside** validation **without breaking loaders** if that metadata lives on the Zod schema instance (Zod 4 `.meta()` / registries / `.describe()`), not as sibling keys on `defineCollection({...})`. Collection-config siblings are stripped by Astro’s content-config parser. Replacing Zod with a non-Zod wrapper in `schema` breaks validation and typegen.
3. Viable authoring-shell patterns: **in-place Zod enrichment**, a **parallel map** (shared modules or separate CMS config), and/or an **overlay** on Astro’s generated `.astro/collections/*.schema.json`. Constraints below force later field-schema model and discovery decisions.

---

## 1. How collection defs and schemas load at dev time

### Where definitions live

Build-time collections are declared in `src/content.config.ts` (also `.js` / `.mjs`; docs also note `.mts`). Each collection uses `defineCollection({ loader, schema? })` and is registered via a single `export const collections = { ... }`.[^docs-cc]

Live collections are separate: `src/live.config.*` + `defineLiveCollection`; live `schema` must be a Zod object (not a function).[^docs-api][^src-config]

Astro resolves the build-time config by searching (in order) `content.config.mjs|js|mts|ts` under `srcDir`. Legacy `src/content/config.*` only works with legacy backwards-compat; otherwise it errors.[^src-utils-paths]

### Load pipeline (dev)

From Astro source:

1. **`loadContentConfig`** — `environment.runner.import(configPathname)` (Vite runnable env), then **`contentConfigParser(...).safeParse(unparsedConfig)`**. On success, hashes the config file bytes into a `digest`.[^src-utils-load]
2. **`reloadContentConfigObserver`** — sets observer status `loading` → `loaded` | `does-not-exist` | `error`. Comment in source: content config is loaded separately from other `src/` files; the observable lets plugins subscribe during dev updates.[^src-utils-load]
3. **`ContentLayer.watchContentConfig`** — on `loaded` with a new digest, enqueues **`sync()`**.[^src-layer]
4. During sync, for each content-layer collection, schema is taken from the collection, else from `loader.schema` / `loader.createSchema()`. Loaders receive `parseData` that calls **`getEntryData`** → resolve function schemas with `SchemaContext` → **`schema.safeParseAsync(data)`**.[^src-layer][^src-utils-entry]
5. Typegen writes `.astro/collections/<name>.schema.json` via **`z.toJSONSchema(..., { io: 'input', unrepresentable: 'any' })`** when a schema exists.[^src-types][^docs-jsonschema]

`defineCollection` itself is largely a tagger/validator: with a `loader`, it forces `type: 'content_layer'` and returns the config object; it does not execute loaders.[^src-config]

### What Astro’s config parser accepts

`contentConfigParser` expects `{ collections: Record<string, CollectionConfig> }` where each collection is a union of shapes with known keys (`type`, `schema`, `loader`, and for loaders optionally `createSchema`). Loader `schema` values must be Zod (`'_zod' in v`); function-shaped loader schemas are warned and ignored.[^src-utils-parser]

Implication: **extra siblings** on a collection config (e.g. `ui`, `fields`, `cms`) are **not part of the parsed shape**. Under Zod’s default object behavior they are stripped when Astro re-parses the module export—so they do not survive into the Content Layer observer even if `defineCollection` returned them unchanged.

### Schema resolution rules

| Source | Behavior |
| --- | --- |
| Collection `schema` | Optional ZodType **or** `(context: SchemaContext) => ZodType`. Context provides `image()`.[^docs-api] |
| Loader `schema` / `createSchema()` | Default when collection has no schema; **overridden** by collection schema.[^docs-loader] |
| Live collection `schema` | Zod object only (no function); optional; overrides loader types when present.[^docs-api][^docs-cc] |

Docs: Zod is re-exported from `astro/zod` and “supports all of the features of Zod 4.” Schema methods (e.g. `.parse()`, `.transform()`) are available with noted limits (e.g. `image().refine()` unsupported).[^docs-cc][^docs-zod]

---

## 2. Can a field schema carry UI metadata without breaking loaders?

### What “breaking” means here

Loaders and Content Layer care that `schema` (after function resolution) is a **Zod schema** whose `safeParseAsync` validates **entry data**. Anything that:

- makes `schema` non-Zod, or
- changes parse success/output so entry data no longer matches content files,

breaks Astro’s path. Metadata that is **not part of the parsed data shape** does not.

### In-place on Zod (supported by Zod; compatible with Astro validation)

Zod 4 metadata/registries: `.meta()`, `.describe()`, `z.globalRegistry`, custom `z.registry()`. Metadata is associated with schema instances; it is not entry data. `.meta()` / `.describe()` return new schema instances (immutability); chaining order matters.[^zod-meta]

Astro maintainers closed the roadmap request to support Zod `.meta` in content collections, noting support was added.[^roadmap-1238] Typegen already reads `z.globalRegistry` when injecting `$schema` into generated JSON Schema objects, then calls `z.toJSONSchema`.[^src-types]

**Conclusion:** attaching UI hints via **`.meta({ ... })` / custom registries / `.describe()`** on field Zod schemas does **not** break Content Layer validation. It is the only in-schema enrichment pattern that stays on the object Astro actually keeps (`schema`).

Caveats for UI generation from the same schema:

- JSON Schema generation uses **`io: 'input'`** and **`unrepresentable: 'any'`**—transforms and exotic types may not round-trip cleanly for editors.[^src-types]
- Function schemas are evaluated for JSON Schema with a stub `image: () => z.string()`, not the full image helper used at parse time.[^src-types]
- Top-level object `.meta()` must survive Astro’s `.extend({ $schema })` + registry re-add; field-level meta is the safer enrichment point (maintainers discussed top-level meta loss in roadmap #1327).[^src-types]
- `GlobalMeta` documents `id`, `title`, `description`, `deprecated`, plus index signature for unknown keys; custom UI keys need a deliberate registry or declaration merging strategy.[^zod-meta]

### What does **not** work as Astro `schema`

Putting a product **`Field { schema, ui }`** object where Astro expects Zod:

- fails loader schema checks (`'_zod' in v`),[^src-utils-parser]
- fails `safeParseAsync` in `getEntryData`,[^src-utils-entry]
- breaks typegen / JSON Schema generation.

Putting UI maps as **siblings** of `schema` on `defineCollection` does not survive Astro’s content-config parse (see above).

---

## 3. Patterns for driving an authoring shell from those defs

| Pattern | Idea | Fits Astro? | Tradeoffs |
| --- | --- | --- | --- |
| **In-place enrichment** | Same Zod trees in `content.config`; UI via `.meta()` / registry | Yes for validation; meta flows into `.schema.json` via `toJSONSchema` when representable | Couples CMS UI vocabulary to Zod/Astro; meta lost across some Zod transforms; shell must walk Zod or consume JSON Schema |
| **Parallel map** | Shared modules: Zod for Astro + separate field-schema/UI map; or `cms.config` keyed by collection/field | Yes—Astro never sees the map | Two sources of truth unless composed from one factory; discovery must find the map |
| **Overlay** | Use Astro’s `.astro/collections/*.schema.json` (and/or live Zod import) plus a UI overlay file | Yes—codegen is first-party; overlay stays out of loaders | Generated files are build/dev artifacts; timing/race with sync; incomplete for markdown **body** (outside frontmatter schema) |

### Dynamic import notes (authoring shell at dev time)

- Importing the host’s `content.config` (or shared schema modules) from shell routes/endpoints that run in the **same Vite/Astro graph** can yield live Zod instances and registry meta—mirroring how Astro loads the file.[^src-utils-load]
- Relying only on `.astro/collections/*.schema.json` avoids executing Zod in the shell but depends on typegen having run and on JSON Schema fidelity (`io: 'input'`).[^docs-jsonschema][^src-types]
- Function schemas need a `SchemaContext` (at least a stand-in `image`) before introspection.[^docs-api][^src-types]
- Collection `schema` overrides loader schema—shell discovery must prefer the same winner Astro uses.[^docs-loader]
- Markdown/MDX **body** is not in the Zod frontmatter schema; glob loaders still expose `body` / render separately—shell UI for body is outside schema enrichment.[^docs-api]

---

## 4. Constraints that force later field-schema and discovery decisions

These should be treated as hard inputs to [Field schema model](../issues/07-field-schema-model.md) and [Collection and schema discovery](../issues/08-collection-discovery.md)—not product picks made here.

1. **Astro `schema` must remain Zod** (or a function returning Zod). Non-Zod field wrappers cannot be the value of `defineCollection.schema`.
2. **Collection-config siblings are not a CMS extension point**—Astro’s parser only keeps known keys; UI cannot hang off `defineCollection({ ui })` and expect Content Layer to retain it.
3. **Enrichment that must ride with Astro’s schema object** → Zod `.meta()` / registries (in-place). **Enrichment that must not** → parallel map or overlay.
4. **Schema may be a function** needing `image` / `SchemaContext`; discovery and form codegen must resolve it the same way typegen does (or document a stub).
5. **Loader vs collection schema precedence** and optional schemas (loader-only) affect which Zod tree the shell must read.
6. **Build-time vs live** configs are different files and APIs (`content.config` vs `live.config`; live schema not a function).
7. **`reference()` and `image()`** are Astro-specific schema helpers; UI widgets cannot treat them as plain strings/objects without a convention.
8. **Transforms / coerce** change input vs stored/query types; Astro’s JSON Schema uses **input** shape—editors and **write-back** must agree on which side they edit.
9. **Body vs data fields**: frontmatter/data Zod does not describe markdown body; shell layout for markdown-ish collections needs a separate rule.
10. **Generated JSON Schema is an artifact** under `.astro/collections/`, not the source of truth; using it as the sole discovery surface couples the shell to sync/typegen timing and `unrepresentable: 'any'` holes.
11. **Zod meta immutability**: `.meta()` after `.refine()` / new instances can drop prior meta unless registration is careful—field-schema helpers must own chaining order.[^zod-meta]

---

## Sources

[^docs-cc]: [Content collections](https://docs.astro.build/en/guides/content-collections/) — `content.config` location, `defineCollection`, Zod 4 via `astro/zod`, schema methods, live collections split, JSON Schema output under `.astro/collections/`.

[^docs-api]: [Content Collections API Reference](https://docs.astro.build/en/reference/modules/astro-content/) — `defineCollection` / `defineLiveCollection`, `schema` types, `SchemaContext.image`, `reference()`, entry `data` / `body`.

[^docs-zod]: [Zod API Reference (`astro/zod`)](https://docs.astro.build/en/reference/modules/astro-zod/) — re-export of Zod 4 for Content Collections / Actions.

[^docs-loader]: [Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/) — loader `schema` / `createSchema()`, collection schema overrides loader schema, `parseData()`.

[^docs-jsonschema]: Same content collections guide, “Using JSON Schema files in your editor” — per-collection `.astro/collections/<name>.schema.json`.

[^src-config]: [`packages/astro/src/content/config.ts`](https://github.com/withastro/astro/blob/main/packages/astro/src/content/config.ts) — `defineCollection` / `defineLiveCollection` behavior and schema typing.

[^src-utils-paths]: [`packages/astro/src/content/utils.ts`](https://github.com/withastro/astro/blob/main/packages/astro/src/content/utils.ts) — `getContentPaths` / `searchConfig` file list and legacy handling.

[^src-utils-load]: Same file — `loadContentConfig` (Vite `runner.import`), digest, `reloadContentConfigObserver`, `globalContentConfigObserver`.

[^src-utils-parser]: Same file — `contentConfigParser` union shapes and Zod `_zod` check for loader schemas.

[^src-utils-entry]: Same file — `getEntryData` function-schema resolution and `safeParseAsync`.

[^src-layer]: [`packages/astro/src/content/content-layer.ts`](https://github.com/withastro/astro/blob/main/packages/astro/src/content/content-layer.ts) — digest watch, sync, schema fallback to loader, `parseData` wiring.

[^src-types]: [`packages/astro/src/content/types-generator.ts`](https://github.com/withastro/astro/blob/main/packages/astro/src/content/types-generator.ts) — `generateJSONSchema`, `z.globalRegistry` preserve, `z.toJSONSchema({ io: 'input', unrepresentable: 'any' })`.

[^src-loader-types]: [`packages/astro/src/content/loaders/types.ts`](https://github.com/withastro/astro/blob/main/packages/astro/src/content/loaders/types.ts) — `Loader.schema` | `createSchema`, `LoaderContext.parseData`.

[^zod-meta]: [Zod — Metadata and registries](https://zod.dev/metadata) — `.meta()`, `.describe()`, `z.globalRegistry`, immutability notes.

[^roadmap-1238]: [withastro/roadmap#1238](https://github.com/withastro/roadmap/discussions/1238) — Zod `.meta` for content collections; maintainer note that support was added (discussion closed).
