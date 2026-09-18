---
status: accepted
---

# Server/FS discovery uses live `content.config`; the browser does not

For the **filesystem / Astro host adapter**, discover editable collections by Vite-importing the host `src/content.config.*` and reading `export const collections` — the same graph Astro uses. Collection chrome may use root schema `.meta(config({...}))`. No required parallel discovery registry for that adapter (`src/cms.config.ts` is the browser editor edge only — see [ADR-0016](0016-astro-convention-install-surface.md)). JSON-Schema digests alone are insufficient when `meta.ui` holds components.

Path mapping `(collection, id) → file` stays **inside the FS adapter**. Clients and the CMS protocol never send filesystem paths.

The **browser authoring UI** does not import `content.config` for editor schemas. It imports build-time editor configuration (schemas, layouts, direct Svelte components) through the host module graph, e.g. `virtual:@cms/config`. Server registry and client config are two edges, not one shared load.
