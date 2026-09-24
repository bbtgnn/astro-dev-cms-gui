---
status: superseded by ADR-0025
---

# CMS-first semantic schema; Astro `content.config` is generated

Superseded by
[ADR-0025](0025-schema-first-content-config-optional-overlay.md).

Historical decision: one CMS unified tree in `src/cms.config.ts` as human
source; compile to form model, authoritative validator, and generated native
`src/content.config.ts`. Superseded FieldUi-on-Zod ([ADR-0003](0003-field-ui-on-zod-meta.md))
and the dual-authority split of [ADR-0004](0004-live-content-config-discovery.md) /
[ADR-0016](0016-astro-convention-install-surface.md) as then written.

Kept as history: closed algebra, Vite-only components catalog, and the
rationale that public Astro `image()` / `z.input` typing does not recover
persisted path + kind without marks — addressed under schema-first by
[ADR-0024](0024-content-field-stamps-live-in-core.md) stamps rather than
generation.
