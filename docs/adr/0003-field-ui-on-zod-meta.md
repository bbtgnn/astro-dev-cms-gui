---
status: accepted
---

# FieldUi rides on Zod `.meta()`, not collection siblings

Astro keeps collection `schema` as Zod and strips unknown `defineCollection` siblings. Authoring UI metadata therefore attaches via Zod `.meta()` / a FieldUi registry — never as non-Zod `Field { schema, ui }` objects inside Astro's schema slot.

Builders return Zod with FieldUi `{ widget, label?, options? }` (`widget` is the registry key). End users may attach `meta({ ui: Component })` directly. Forms and persistence operate on the Zod **input** shape (editor projection); Astro templates consume the separate **output** projection.

Direct Svelte component refs are non-serializable: they reach the browser through the host Vite module graph (e.g. `virtual:@cms/config`), not through the CMS protocol or Astro island props.
