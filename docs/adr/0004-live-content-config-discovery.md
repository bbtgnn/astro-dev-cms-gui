---
status: accepted
---

# Server/FS discovery uses live `content.config`; the browser does not

For the **filesystem / Astro host adapter**, discover editable collections from
the CMS schema partition / compiled IR (ADR-0019). Generated
`src/content.config.*` remains Astro’s collection graph; the package default
host no longer Vite-imports it for FieldUi discovery.

Path mapping `(collection, id) → file` stays **inside the FS adapter**. Clients
and the CMS protocol never send filesystem paths.

The **browser authoring UI** does not import `content.config`. It imports the
compiled editor/form projection through the host module graph (e.g.
`virtual:@cms/config`). Server registry and client config remain two edges, not
one shared load — even though one human source produces both.

**Amended by [ADR-0019](0019-cms-first-semantic-schema.md):** live
`content.config` FieldUi discovery and Zod `.meta(config(...))` chrome are
historical; CMS-first default host uses the schema partition.
