---
status: accepted
---

# Default host uses schema partition; browser never loads `content.config`

For the **filesystem / Astro host adapter**, build editable collection
descriptors from the CMS schema partition / compiled IR
([ADR-0019](0019-cms-first-semantic-schema.md),
[ADR-0020](0020-ir-form-model-only-editor-configuration.md)). Generated
`src/content.config.*` remains Astro’s collection graph and type surface; the
package default host does not Vite-import it for editor schemas or FieldUi.

Path mapping `(collection, id) → file` stays **inside the FS adapter**. Clients
and the CMS protocol never send filesystem paths.

The **browser authoring UI** does not import `content.config`. It imports the
compiled editor/form projection through the host module graph (e.g.
`virtual:@cms/config`). Server registry and client config remain two edges, not
one shared load — even though one human source produces both.

**Historical:** live `content.config` FieldUi discovery and Zod `.meta(config(...))`
chrome were the pre–ADR-0019 dual seam; removed under ADR-0020.
