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
- **`@cms/core`** — semantic IR, CMS protocol, client, and FS write-back
  adapters behind `createCmsProtocol` / `createCmsHost`.
- **`@cms/astro`** — Astro host mount (`cms()`), HTTP dispatcher/middleware, and
  content.config generation.
- **`@cms/astro-template`** — reference host for self-host validation (not a
  product package).

Supersedes [ADR-0009](0009-conceptual-layers-before-package-extraction.md): the
seams are stable enough to lock this coarse graph. Prefer folder seams inside
these packages over new packages until a second real adapter or host forces a
split.
