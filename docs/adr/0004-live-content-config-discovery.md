---
status: accepted
---

# Server/FS discovery uses live `content.config`; the browser does not

For the **filesystem / Astro host adapter**, discover editable collections by
Vite-importing the host `src/content.config.*` and reading
`export const collections` — the same graph Astro uses. Under
[ADR-0019](0019-cms-first-semantic-schema.md) that file is **generated** from
`src/cms.config.ts`; discovery still reads the live generated module, not a
parallel registry.

Path mapping `(collection, id) → file` stays **inside the FS adapter**. Clients
and the CMS protocol never send filesystem paths.

The **browser authoring UI** does not import `content.config`. It imports the
compiled editor/form projection through the host module graph (e.g.
`virtual:@cms/config`). Server registry and client config remain two edges, not
one shared load — even though one human source produces both.

Human-authored FieldUi on Zod `.meta()` / collection chrome via root schema
`.meta(config({...}))` is superseded by ADR-0019’s unified tree.
