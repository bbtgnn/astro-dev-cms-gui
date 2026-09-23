# Schema → form model projection

Schema-first path (exploration branch): stamped Zod collection schemas project to
browser **form models**, then lower to `EditorCollectionInput` for `@cms/authoring`.

## Public faces

| Package | API | Output |
| --- | --- | --- |
| `@cms/core/semantic` | `projectSchemaFormModel(s)` / `applySchemaFormOverlay` | `CollectionFormModel` (thin internal form IR); optional `form` tree lowers layout + field-ref chrome |
| `@cms/authoring` | `editorCollectionsFromSchemas(collections, catalog, { overlays? })` | `EditorCollectionInput` per collection |

Stamps (`Symbol.for("@cms/astro.contentFieldStamp")` + `.meta.cms`) mark `image` /
`reference` kinds. Overlay is nested path chrome (`label`, `editor` key) — not
FieldUi-on-Zod. Singleton chrome lands with `defineCms` (tickets 05/07).

## Dual engines (Ajv client vs authoritative parse)

- **Client:** projected JSON Schema → Ajv via SJSF after lowering. Structural UX
  gate only; Zod 4 / draft-2020-12 features may be stripped (`$schema`, stamp `cms`).
- **Authoritative:** host runs the live Zod / Standard Schema **Input** `.parse` /
  `.safeParse` on write-back. Do not require Ajv ≡ Zod.

Image stamps force client schema `{ type: "string" }` (persisted path Input) even
when Astro’s `image()` Zod looks like metadata Output.
