# Authoring shell — buildable spec

Hand-offable build brief for implementers. Domain language: root `CONTEXT.md`. Decision provenance: `.scratch/authoring-shell-spec/issues/`.

---

## 1. Framing

### 1.1 Problem / motivation

Astro content collections already define Zod schemas and loaders, but local authoring still means hand-editing files or adopting a heavy CMS (hosted Git, GraphQL, always-on admin). We need a **server-light authoring shell**: Svelte UI hosted by the Astro dev app, schemas drive forms, edits **write-back** to the repo filesystem. Installable from GitHub (usable, not a polished registry product). No production CMS server.

Borrow from prior art: local FS write-back (Keystatic/Tina-style), field registry / custom-field packages (Decap/Pages/Tina). Reject as v1 defaults: hosted GitHub App/OAuth write path, always-on CMS servers, Tina GraphQL-as-requirement, parallel forever-YAML schemas as the core route.

### 1.2 Users & self-host validation

- **Primary users:** developers integrating the shell into an Astro content project; authors editing content locally through the shell during development.
- **Self-host validation:** prove the product by running it on a real local Astro host — especially `@cms/astro-template` (Bun workspace) — not only docs or demos.

### 1.3 Non-goals / out of scope

- Offline / PWA / Deno-desktop / isomorphic-git sync authoring products  
- **Deno Deploy** (or other read-only edge hosts) as the write-back target  
- Non-developer editor UX, auth, hosted preview  
- Polished npm-registry marketplace packaging (GitHub-installable is the bar)  
- Hosted GitHub App/OAuth as the **default** v1 write path  
- Live Content Layer collections in v1  
- Singleton/file collections in v1 (`kind: 'singleton'` reserved only)

Informed by: [Prior art for git-backed schema-driven CMS](issues/02-prior-art-git-schema-cms.md), [Deno as @cms/astro-template runtime](issues/03-deno-astro-template-runtime.md), [Buildable spec outline](issues/06-buildable-spec-outline.md), map Out of scope.

---

## 2. Core authoring loop

At author-time, the shell must support:

1. **Discover / list collections** (editable build-time collections from `content.config`)  
2. **List entries** in a collection  
3. **Open** an entry into the **form shell**  
4. **Edit** fields (Zod **input** shape + FieldUi)  
5. **Write-back** via upsert (validate-before-write)  
6. **Create** a new entry  
7. **Delete** an entry  
8. **Validation failure** surfaced when Zod `safeParse` fails (HTTP `400` / UI errors)

No privileged Astro `body` channel — markdown lives in `data`. UI chrome / IA detail is §5.

Informed by: [Buildable spec outline](issues/06-buildable-spec-outline.md), [Write-back contract (files-only v1)](issues/05-write-back-contract.md), [Collection and schema discovery](issues/08-collection-discovery.md).

---

## 3. Architecture

### 3.1 Package map (`@cms/*`)

```
@cms/fields → @cms/components → @cms/form → @cms/crud → @cms/routes → @cms/astro-template
                    └── shadcn/ (+ other modules)
```

No separate `@cms/collection` package — collection list/IA lives in `@cms/routes` (chrome from `@cms/components`).

| Package | Owns | Must not |
|---|---|---|
| `@cms/fields` | Zod builders, `config()`, FieldUi registry + defaults, Zod→JSON Schema helpers | Svelte, Astro, FS I/O |
| `@cms/components` | `shadcn/` primitives; shared chrome modules | Write-back, sjsf field pipeline |
| `@cms/form` | Wrap [svelte-jsonschema-form](https://x0k.dev/svelte-jsonschema-form/); form shell; form widgets | HTTP/FS, Astro integration; apps should not need raw `@sjsf/*` for the default path |
| `@cms/crud` | DTOs, fetch client, **write-mode** interface (injectable writer) | Svelte UI |
| `@cms/routes` | Astro **dev integration**, shell pages, HTTP endpoints; injects concrete write mode; **barrel re-exports** public API | Redefining field registry / deep widgets |
| `@cms/astro-template` | Bun self-host Astro app: sample collections, wiring | Reimplementing the packages above |

**Consumer surface:** depend on **`@cms/routes` only** (pulls the graph). End users import builders, `config`, and integration from `@cms/routes`. Add the Astro integration; configurable mount path.

**Workspace:** Bun workspaces via root `package.json`; each publishable package + template has its own `package.json`. Lint/format with Biome.

Informed by: [Monorepo package boundaries for @cms/*](issues/04-monorepo-package-boundaries.md).

### 3.2 Bun / Node runtime notes

- **Template self-host:** **Bun** (Astro `dev`/`build`, `@astrojs/svelte`, workspaces, local FS write-back via `nodeFsWriter`).  
- **Packages / portable consumers:** **Node**-compatible `package.json` graph (installable with Bun or npm).  
- Do **not** treat Deno Deploy (or other read-only edge hosts) as a write-back target.

Historical research (Deno dogfood path): [Deno as @cms/astro-template runtime](issues/03-deno-astro-template-runtime.md).

---

## 4. Content model

### 4.1 Field-schema model

**Astro `schema` stays Zod.** Do not put non-Zod `Field { schema, ui }` objects in `defineCollection({ schema })`. Do not hang UI off `defineCollection({ ui })` — Astro’s content-config parser strips unknown siblings.

**Authoring API** (implemented in `@cms/fields`, imported from `@cms/routes`):

- Named builders: `text`, `markdown`, `number`, …  
- Escape hatch: `field(zod, ui)`  
- Builders **return Zod** with FieldUi via `.meta()` / registry (helpers own chaining order)

**FieldUi (built-ins):**

```ts
{ widget: string; label?: string; options?: Record<string, unknown> }
```

- No separate `id` — **`widget` is the registry key**.  
- **End-user extension:** `z.string().meta({ ui: Component })` (or `field(zod, { ui: Component })`). Direct `ui` wins over widget defaults. Schema modules may import Svelte components; `@cms/fields` stays Svelte-free.

**Edit/write shape:** always Zod **input**. Bridge: Zod → `toJSONSchema` (input) + FieldUi/`ui` → sjsf `uiSchema` (or equivalent). `@cms/fields` owns helpers; `@cms/form` consumes. Exotic transforms: custom UI or documented limits — no output-shape editing in v1.

**v1 built-ins:** string/text, number, boolean, enum/select, date/datetime, object, array, `markdown` (widget only — no role/segment), Astro `reference()` → reference widget, Astro `image()` → stub (rich image = open thread).

**Reserved open-thread widgets:** `i18n`, rich `image`, `blocksLayout` — stubs; replace via `meta.ui` or later bindings.

Informed by: [Astro schema load and UI metadata](issues/01-astro-schema-load-and-ui-metadata.md), [Field schema model](issues/07-field-schema-model.md).

### 4.2 Collection & schema discovery

**Primary source:** live Vite-import of host `src/content.config.*`; read `collections`. **No required `cms.config`.**

**Collection chrome:** root schema `.meta(config({ label?, hidden?, pathTemplate? | base?, kind? }))`. Reserved `kind: 'singleton'` — not implemented in v1.

**Editable in v1:** build-time Content Layer collections with resolvable Zod + filesystem loader the writer can map. Skip live collections and schema-less collections.

**Schema resolution (match Astro):** collection `schema` → else loader `schema`/`createSchema()` → resolve function schemas with `SchemaContext` (`image` stub OK) → else not editable.

**Path mapping:** server-side `(collection, id)` → path from loader introspection (glob base + id/slug); optional root `config` overrides. Clients never send FS paths.

**Markdown:** fields in `data` with `widget: 'markdown'`. Multi-markdown on-disk serialization still **unspecified** (do not invent layout here).

**API (server / write-mode):** `listCollections()` → `{ name, label?, schema, config?, loaderHint? }[]`. Re-import on config change when practical (Vite HMR / digest).

**Template:** sample `content.config` uses builders/`config` from `@cms/routes`; FS write-mode injection; no parallel CMS config file.

Informed by: [Astro schema load and UI metadata](issues/01-astro-schema-load-and-ui-metadata.md), [Collection and schema discovery](issues/08-collection-discovery.md), [Field schema model](issues/07-field-schema-model.md).

---

## 5. Shell surface

### 5.1 IA / routes

- Mount prefix configurable; default shell catch-all **`/_cms/[...path]`**.  
- One dispatcher serves **shell UI segments** and **JSON API** paths (e.g. `api/collections/...`).  
- Consumer wires a single handler via `@cms/routes` **dev integration**.  
- Collection list / entry list / entry editor composed in `@cms/routes` using `@cms/components` chrome and `@cms/form` for the editor.

Exact page tree and visual chrome are implementer details within this mount; they must support the §2 loop.

Informed by: [Write-back contract (files-only v1)](issues/05-write-back-contract.md), [Monorepo package boundaries for @cms/*](issues/04-monorepo-package-boundaries.md).

### 5.2 Write-back / write mode / writer

**Write-mode ops (v1):** `listCollections`, `listEntries`, `getEntry`, `upsertEntry`, `deleteEntry`.  
`runCommand` (and similar) **reserved** — not implemented.

**Entry payload:**

```ts
{ id: string; collection: string; data: Record<string, unknown> }
```

- `data` = collection Zod **input** (all fields, including markdown).  
- Validate with `safeParse` before write → `400` on failure.  
- v1 **last-write-wins** (optional `ifMatch` later).

**Injection:**

```ts
createWriteMode({
  root,
  allowPaths,
  writer, // nodeFsWriter() | /* later seams */
})
```

- **Writer** = low-level read/write/remove/list within allowlisted roots.  
- **Write mode** = domain ops + Zod validation + path mapping.  
- v1 ships **FS writers** only (Node/`nodeFsWriter`).

**Guard:** write API **dev-only by default** (`import.meta.env.DEV` / `devOnly: true`). Refuse in production builds unless explicitly overridden.

Informed by: [Write-back contract (files-only v1)](issues/05-write-back-contract.md), [Monorepo package boundaries for @cms/*](issues/04-monorepo-package-boundaries.md).

---

## 6. Open threads / extension seams

Named unresolved — seams only, no deep contracts:

1. **Shell commands / non-FS writers** — `runCommand`, `githubRepoWriter()`, etc. on the writer/write-mode seam; v1 = FS writers only.  
2. **Custom fields** — `i18n`, rich `image` (wasm webp + srcsets), `blocksLayout` (Kirby-like blocks + available-blocks list). Reserved widgets/stubs; deep behavior unspecified.  
3. **End-user form UI composition** — chrome/slots beyond field-level `.meta({ ui: Component })` + sjsf theme/`ui:components`; exact API unspecified.  
4. **Schema builder UI** — author field schemas / collection defs via shell UI; v1 remains code-defined schemas → forms.

Also still unspecified (not invented here): multi-markdown file serialization; exact glob→path edge cases; GitHub install URL syntax (boundary: install root = `@cms/routes`).

Informed by: map Notes / Not yet specified; [Buildable spec outline](issues/06-buildable-spec-outline.md).

---

## 7. Phased MVP

Suggested build order (closed route only):

| Phase | Deliverable |
|---|---|
| **P0 — Skeleton** | Monorepo packages + dependency graph; `@cms/routes` integration stub; Bun workspace + per-package `package.json` |
| **P1 — Write-back** | `createWriteMode` + FS writers; `/_cms/[...path]` dispatcher; entry payload + validate-before-write; dev-only guard |
| **P2 — Discovery** | Live `content.config` import; schema resolution; `listCollections` / path map from loaders; root `config()` |
| **P3 — Fields + form** | Builders + FieldUi; Zod→JSON Schema + sjsf form shell; core scalars/object/array; `meta.ui` Component override |
| **P4 — Shell loop** | Collection list → entry list → editor; create / upsert / delete; validation errors in UI |
| **P5 — Content widgets** | `markdown`, `reference`, `image` stub; sample collections in `@cms/astro-template` |
| **P6 — Self-host proof** | Template runnable via `bun run dev`; Node/Bun portable smoke on packages |

Open threads (§6) are **after** P6 unless a stub is needed for compilation (reserved widget ids).

Informed by: [Buildable spec outline](issues/06-buildable-spec-outline.md), locked tickets 03–08.

---

## Appendix — ticket index

| Ticket | Title |
|---|---|
| 01 | [Astro schema load and UI metadata](issues/01-astro-schema-load-and-ui-metadata.md) |
| 02 | [Prior art for git-backed schema-driven CMS](issues/02-prior-art-git-schema-cms.md) |
| 03 | [Deno as @cms/astro-template runtime](issues/03-deno-astro-template-runtime.md) |
| 04 | [Monorepo package boundaries for @cms/*](issues/04-monorepo-package-boundaries.md) |
| 05 | [Write-back contract (files-only v1)](issues/05-write-back-contract.md) |
| 06 | [Buildable spec outline](issues/06-buildable-spec-outline.md) |
| 07 | [Field schema model](issues/07-field-schema-model.md) |
| 08 | [Collection and schema discovery](issues/08-collection-discovery.md) |
| 09 | [Draft the buildable authoring-shell spec](issues/09-draft-buildable-spec.md) |
