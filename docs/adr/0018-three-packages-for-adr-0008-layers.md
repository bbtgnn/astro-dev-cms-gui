---
status: accepted
---

# Three packages aligned to ADR-0008 layers

Collapse the prototype `@cms/*` graph into three product packages plus the
reference host, matching the conceptual layers in
[ADR-0008](0008-backend-agnostic-ui-fs-first-adapter.md):

- **`@cms/authoring`** — authoring UI (shell, form shell, chrome). Browser-safe;
  may import `@cms/core/semantic`, `@cms/core/fetch-client`, and
  `@cms/core/protocol` only — not the `@cms/core` root (FS writers) or
  `@cms/astro`.
- **`@cms/core`** — semantic IR, CMS protocol, client, FS write-back adapters
  behind `createCmsHost`, and portable `defineCms`.
  Content-field stamps (image / file / reference marks on Zod leaves) live here —
  [ADR-0024](0024-content-field-stamps-live-in-core.md).
- **`@cms/astro`** — Astro host mount (`cms()`), `defineAstroCms` presentation
  overlay, content-proxy / stamped host. Content-proxy may wrap Astro helpers
  onto core stamps; loader stamps stay Astro-owned (ADR-0024). See
  [ADR-0019](0019-cms-first-semantic-schema.md) for `defineCms` /
  `defineAstroCms` ownership.
- **`@cms/astro-template`** — reference host for self-host validation (not a
  product package).

Supersedes [ADR-0009](0009-conceptual-layers-before-package-extraction.md): the
seams are stable enough to lock this coarse graph. Prefer folder seams inside
these packages over new packages until a second real adapter or host forces a
split.
