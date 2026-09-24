---
status: accepted
---

# Astro install surface is convention-first

Consumer Astro hosts should opt in with `cms()` and project files beside Astro’s
own config — not by wiring a host factory and path options in `astro.config`.

**Happy path** ([ADR-0025](0025-schema-first-content-config-optional-overlay.md))

- `integrations: [svelte(), cms()]` — **zero options**
- `src/content.config.ts` — **human-authored** Astro collections (required;
  stamped by content-proxy)
- Optional `src/cms.config.ts` — `defineAstroCms` presentation overlay (form
  tree); optional `src/cms.components.ts` for live editors
- Content entries under `src/content/` (Astro’s conventional content root)

`cms()` requires `src/content.config.ts` (hard-fail in `astro:config:setup` if
missing). It installs content-proxy stamps, injects `/cms`, wires the package
default `CmsHost` from stamped collections (+ optional form trees), and mounts
the protocol HTTP route (default `/cms/api`).

`@cms/astro` builds that default host via stamped CMS assemble
([ADR-0024](0024-content-field-stamps-live-in-core.md)). Projects do not ship
`createHost` unless they replace the adapter.

**Not collapsed**

- Browser editor config and server `content.config` stay separate module-graph
  edges ([ADR-0004](0004-live-content-config-discovery.md), ADR-0008). The
  browser never imports `content.config`.

**Escapes (not on `cms()`)**

- Fixtures / non-convention layouts: `cmsHarness` from `@cms/astro/testing`
- Protocol-only / custom adapter: `createCmsMiddleware` (+ optional project
  `createHost`)

Virtual module IDs (`virtual:@cms/*`) are package-internal implementation.

**Why**

The reference hosts must look like real consumers. An options matrix on
`cms()` taught a mode story after the product already chose one default.
Escapes stay available; they are not the install face.

Amended by [ADR-0025](0025-schema-first-content-config-optional-overlay.md)
(schema-first files; no generate). Historical CMS-first wording lived under
superseded [ADR-0019](0019-cms-first-semantic-schema.md).
