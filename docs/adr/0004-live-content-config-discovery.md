---
status: accepted
---

# Default host uses stamped collections; browser never loads `content.config`

For the **filesystem / Astro host adapter**, build editable collection
descriptors from **stamped** `content.config` collections (content-proxy marks
for loaders / image / reference) plus optional form trees
([ADR-0025](0025-schema-first-content-config-optional-overlay.md),
[ADR-0024](0024-content-field-stamps-live-in-core.md)). Human-authored
`src/content.config.*` is Astro’s collection graph and the host’s schema/
location authority; the package default host does not Vite-import it into the
browser for editor schemas.

Path mapping `(collection, id) → file` stays **inside the FS adapter**. Clients
and the CMS protocol never send filesystem paths.

The **browser authoring UI** does not import `content.config`. It imports the
compiled editor/form projection through the host module graph (e.g.
`virtual:@cms/config`). Server registry and client config remain two edges, not
one shared load.

**Historical:** CMS-first IR schema partition and live `content.config` FieldUi
discovery (Zod `.meta(config(...))`) were earlier seams; removed under
superseded [ADR-0019](0019-cms-first-semantic-schema.md) /
[ADR-0020](0020-ir-form-model-only-editor-configuration.md), then replaced by
stamps + form trees (ADR-0025).

Amended by [ADR-0025](0025-schema-first-content-config-optional-overlay.md).
