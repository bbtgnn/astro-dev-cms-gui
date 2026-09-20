---
status: accepted
---

# CMS-first semantic schema; Astro `content.config` is generated

The host authors one **unified tree** in `src/cms.config.ts`: persisted shape,
semantic field kinds, layout, and Svelte editor bindings together. A closed
schema algebra is the authority. The compiler projects that IR into (1) a
browser form model, (2) a component-free authoritative persisted-input
validator, and (3) generated native Astro source at `src/content.config.ts`
(real `image()`, `reference()`, loaders, `defineCollection()` — no broad casts).

Astro remains a projection target. Public Astro/`z.input` typing does not
reliably recover persisted image paths as `string`; the IR owns persisted input
and semantic kind. Templates still get exact `CollectionEntry` output inference
from the generated native file.

**Authoring invariants (v1):** array children on every container; durable nodes
use `id` + optional `label` (`s.field` / nested object/array/union); presentation
nodes (`tabs`/`tab`, `stack`, `columns`/`column`, `group`, `header`,
`separator`) do not persist; path-local ids are unique; `component` replaces
object/array UI, `wrapper` wraps children (mutually exclusive); editor-specific
props live in an explicit `props` bag; stock editors come from semantic kind;
no native Zod escape hatch; `glob` is the only first-class loader; discriminant
fields are injected on unions.

**Generation:** commit generated `content.config.ts`. `cms()` regenerates in
`astro:config:setup` (dev/sync/check/build) without mandatory host script
wrappers. Writes are atomic and embed a source hash; CI runs
`cms generate --check`. Schema generation loads a **Svelte-free schema
partition** only (`src/cms.schema.ts` by convention) — never browser-only
editor modules from `cms.config.ts`. v1 keeps that partition as a second
hand-authored file in sync with `cms.config` by discipline; a single-source
or codegen seam is a follow-up, not a change to this authority split.

**Packages:** `@cms/core` owns IR and serializable models (no Svelte);
`@cms/authoring` owns Svelte contracts and the form shell;
`@cms/astro` owns `defineCms` / emission / generation / host validation
([ADR-0018](0018-three-packages-for-adr-0008-layers.md)).

**Why not Astro-native schemas + sparse editor config:** Astro 7’s public
`image()` typing blocks compile-time recovery of persisted path + image kind
from `z.input` without CMS wrappers or generated tokens. Owning the algebra
costs a product schema language and generation lifecycle; a Gate 4 spike on
Astro 7 showed that lifecycle is workable with committed generated source
(ordering in `astro:config:setup`, atomic hash/`--check`, opaque partition
load). Residual by design: public `z.input` still does not recover image path
strings — the IR owns persisted input.

Supersedes [ADR-0003](0003-field-ui-on-zod-meta.md) (FieldUi no longer rides on
Zod `.meta()`).

Supersedes the human-authored dual-authority split in
[ADR-0004](0004-live-content-config-discovery.md) and
[ADR-0016](0016-astro-convention-install-surface.md): `cms.config.ts` is the
human source; `content.config.ts` is generated output. Runtime module-graph
separation remains — the browser still must not import `content.config`, and
Astro still must not import Svelte editor modules. Live FS discovery may keep
reading the generated `collections` export.

[ADR-0010](0010-persisted-input-with-environment-schema-projections.md) and
[ADR-0011](0011-sjsf-internal-one-form-recursive-layout.md) remain; the IR is
the explicit persisted-input authority, and layout is authored in-tree rather
than as a separate selector callback.
