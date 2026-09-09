# Collection and schema discovery

Type: grilling
Status: resolved
Blocked by: 01

## Question

Given [Astro schema load and UI metadata](01-astro-schema-load-and-ui-metadata.md), choose how the **authoring shell** discovers **collections** and their **field schemas** at dev time (convention on `content.config` / Content Layer vs explicit `cms.config` vs hybrid). Spec the discovery contract for `@cms/routes` / `@cms/astro-template`.

## Answer

### Primary source

- **Live Vite-import** of host `src/content.config.*` (same graph as Astro). Read `export const collections`.
- **No required `cms.config`.** Field UI stays on Zod meta ([Field schema model](07-field-schema-model.md)). Collection chrome uses **root schema** `.meta(config({...}))`, not `defineCollection` siblings (Astro strips those).
- **Not** JSON-Schema-only (`.astro/collections/*.schema.json`) — components in `meta.ui` are non-serializable.
- **v1 scope:** build-time Content Layer collections with a resolvable Zod schema and a filesystem loader the writer can map. **Skip** live collections and schema-less collections (opt-in later).

### Schema resolution (match Astro)

1. Collection `schema` if present  
2. Else loader `schema` / `createSchema()`  
3. Resolve function schemas with `SchemaContext` (`image` stub OK)  
4. If none → collection not editable in the shell  

### Path mapping

- Server-side only: `(collection, id)` → path from loader introspection (e.g. glob base + id/slug conventions).
- Optional overrides on collection root `config({ pathTemplate? | base? })`.
- Clients never send FS paths ([Write-back contract](05-write-back-contract.md)).

### Collection vs singleton

- v1 = multi-entry collections only.
- Reserve `config({ kind: 'singleton' })`; not implemented in v1.

### Markdown

- No privileged Astro `body` API in the shell. Markdown = fields in `data` with `widget: 'markdown'`.
- Multi-markdown on-disk layout remains fog (serializer later).

### Discovery API

Owned/used by `@cms/routes` write-mode (server), not the browser:

`listCollections()` → `{ name, label?, schema, config?, loaderHint? }[]`  
Entry ops use the resolved path map; form shell receives live Zod + FieldUi.

Re-import on config change when practical (Vite HMR / digest), same spirit as Astro’s content-config observer.

### `config()` + single consumer import

- Implement `config(meta)` (and field builders) in `@cms/fields`.
- **End users import only from `@cms/routes`** (barrel re-exports). Matches [Monorepo package boundaries](04-monorepo-package-boundaries.md) consumer surface; `@cms/fields` remains the implementation home (routes does not redefine the registry).
- Documented collection `config` keys: `label?`, `hidden?`, `pathTemplate?` / `base?`, reserved `kind?: 'collection' | 'singleton'`.

### Template

`@cms/astro-template` wires sample `content.config` with builders/`config` imported from `@cms/routes`, plus FS write-mode injection — no parallel CMS config file required.

### Informed by

- [Astro schema load…](01-astro-schema-load-and-ui-metadata.md) + research
- [Field schema model](07-field-schema-model.md) — live Zod, `meta.ui`
- [Write-back contract](05-write-back-contract.md)
- [Monorepo package boundaries](04-monorepo-package-boundaries.md)

## Comments

- 2026-09-09: Live content.config discovery; root `config()` meta; loader path map; no cms.config; singletons reserved; single import `@cms/routes`.
