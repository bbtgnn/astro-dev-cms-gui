---
status: accepted
---

# Astro install surface is convention-first

Consumer Astro hosts should opt in with `cms()` and project files beside Astro’s own config — not by wiring a host factory and two explicit module paths in `astro.config`.

**Happy path**

- `integrations: [svelte(), cms()]`
- `src/content.config.ts` — Astro collections + server/FS discovery (ADR-0004)
- `src/cms.config.ts` — browser-safe editor projection (FieldUi / Svelte) + preview URL map
- Content entries under `src/content/` (Astro’s conventional content root)

`@cms/astro` builds the default `CmsHost` from live `content.config` discovery, write-back root `src/content`, allowlist from discovered collection bases, and `nodeFsWriter`. Projects do not ship `createHost` / write-mode wiring unless they override.

**Not collapsed**

- Browser editor config and server `content.config` stay separate module-graph edges (ADR-0004, ADR-0008). `cms.config` is not a second discovery registry.
- Explicit `editorConfig`, `hostModule`, and `contentRoot` remain escape hatches for tests and non-default layouts.

**Why**

The reference host must look like a real consumer. Hand-rolled host modules and dual path options taught the wrong install story after the integration already owned `/cms` and `/_cms` mounting.
