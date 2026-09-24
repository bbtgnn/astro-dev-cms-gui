# Schema → form model projection

Schema-first path (exploration branch): stamped Zod collection schemas project to
browser **form models**, then lower to `EditorCollectionInput` for `@cms/authoring`.
There is no CMS-first IR authoring face (`s.field` / `compileSemanticIr`) on this
branch — schema + form tree are the only projection inputs.

## Public faces

| Package | API | Output |
| --- | --- | --- |
| `@cms/core/semantic` | `projectSchemaFormModel(s)` (+ optional `form` tree) | `CollectionFormModel` |
| `@cms/authoring` | `editorCollectionsFromSchemas(collections, catalog, { forms? })` | `EditorCollectionInput` per collection |

Stamps (`Symbol.for("@cms/core.contentFieldStamp")` + `.meta.cms`, ADR-0024) mark
`image` / `reference` kinds. Presentation chrome and layout come from the **form
tree** (field refs + tabs/columns/group) — not path-map overlays or FieldUi-on-Zod.

## Dual engines (Ajv client vs authoritative parse)

- **Client:** projected JSON Schema → Ajv via SJSF after lowering. Structural UX
  gate only; Zod 4 / draft-2020-12 features may be stripped (`$schema`, stamp `cms`).
- **Authoritative:** host runs the live Zod / Standard Schema **Input** `.parse` /
  `.safeParse` on write-back. Do not require Ajv ≡ Zod.

Image stamps force client schema `{ type: "string" }` (persisted path Input) even
when Astro’s `image()` Zod looks like metadata Output.
