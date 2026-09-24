---
status: accepted
---

# Three packages aligned to ADR-0008 layers

Collapse the prototype `@cms/*` graph into three product packages plus
self-host demos, matching the conceptual layers in
[ADR-0008](0008-backend-agnostic-ui-fs-first-adapter.md):

- **`@cms/authoring`** — authoring UI (shell, form shell, chrome). Browser-safe;
  may import `@cms/core/semantic`, `@cms/core/fetch-client`, and
  `@cms/core/protocol` only — not the `@cms/core` root (FS writers) or
  `@cms/astro`.
- **`@cms/core`** — CMS protocol, client, FS write-back adapters behind
  `createCmsHost`, portable `defineCms`, schema→form projection, and
  content-field stamps ([ADR-0024](0024-content-field-stamps-live-in-core.md)).
- **`@cms/astro`** — Astro host mount (`cms()`), `defineAstroCms` presentation
  overlay, content-proxy / stamped host. Content-proxy may wrap Astro helpers
  onto core stamps; loader stamps stay Astro-owned (ADR-0024). Package
  ownership of `defineCms` / `defineAstroCms`:
  [ADR-0025](0025-schema-first-content-config-optional-overlay.md).
- **Reference hosts** (not product packages) live under top-level `demos/`:
  `demos/astro-simple`, `demos/astro-overlay`, `demos/sveltekit`.

Supersedes [ADR-0009](0009-conceptual-layers-before-package-extraction.md): the
seams are stable enough to lock this coarse graph. Prefer folder seams inside
these packages over new packages until a second real adapter or host forces a
split.

Amended by [ADR-0025](0025-schema-first-content-config-optional-overlay.md)
(`demos/` replace `@cms/astro-template`; portable `defineCms` on core).
