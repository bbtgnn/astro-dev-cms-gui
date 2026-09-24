---
status: accepted
---

# Schema-first `content.config`; optional overlay; no generate

User-authored Astro `src/content.config.ts` is validation and location authority
(Standard Schema / Zod **Input**). `@cms/astro` recovers image / reference /
loader metadata via content-proxy stamps ([ADR-0024](0024-content-field-stamps-live-in-core.md)).
Product `cms()` never generates `content.config`.

Presentation is optional: `defineAstroCms` in `src/cms.config.ts` (form tree +
leaf chrome) plus `src/cms.components.ts` for live Svelte. Without an overlay,
stock forms come from stamped schemas. The browser still never imports
`content.config`; the host stamps and projects to form models / descriptors.

Portable non-Astro hosts use `defineCms` on `@cms/core` (schema + location +
form) with the same stamp and form-tree seams; Astro is not required for the
protocol or shell mount.

**Why not keep CMS-first generate (ADR-0019):** owning a product schema algebra
and generation lifecycle forced every consumer through IR, while Astro already
owns collections. Stamps recover the kinds generate used to invent; form trees
cover layout without a second schema language. Exploration on
`explore/schema-first-overlay` proved the happy path; this ADR accepts it.

**Rejected:** dual product paths (generate *and* schema-first). Expand/contract
was considered for never-broken merges; the product keeps one install story.

Supersedes [ADR-0019](0019-cms-first-semantic-schema.md) (CMS-first unified tree
+ generated `content.config`) and [ADR-0020](0020-ir-form-model-only-editor-configuration.md)
(IR form model as the only editor configuration). Supersedes
[ADR-0022](0022-triple-compile-editor-configuration-intentional.md) and amends
[ADR-0023](0023-semantic-projection-peers-stay.md) (IR projection peers / emit
plans are historical).

Amends [ADR-0016](0016-astro-convention-install-surface.md) (happy-path files),
[ADR-0004](0004-live-content-config-discovery.md) (host from stamped collections,
not IR partition), [ADR-0010](0010-persisted-input-with-environment-schema-projections.md)
(persisted Input authority is the stamped schema, not user IR), and
[ADR-0018](0018-three-packages-for-adr-0008-layers.md) (demos under `demos/`,
not `@cms/astro-template`).

Module-graph separation from ADR-0004 / 0008 remains: browser ↔ protocol ↔ host;
no client filesystem paths; components via Vite only.
