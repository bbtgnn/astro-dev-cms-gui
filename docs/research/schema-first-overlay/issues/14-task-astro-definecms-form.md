# 14 — Astro `defineCms` gains `form`

Type: task  
Status: resolved  
Blocked by: [13](./13-task-form-tree-to-form-model.md)

## Goal

Astro options-only `defineCms` accepts a per-collection **form tree** typed from `CmsCollections` / `cms.types.d.ts`. Schemas stay in `content.config`. Migrate overlay demo off path-map `ui` (or dual-accept briefly).

## Acceptance

- [x] `defineCms({ posts: { form, previewUrl?, type? } })`  
- [x] `form` builders scoped so `field("…")` keys are `keyof CmsCollections["posts"]`  
- [x] Shell form models use form tree when present  
- [x] Overlay demo (`packages/astro-demo` until 16) uses tabs or group at least once  
- [x] Path-map `ui` deprecated or removed in the same PR if cheap; else dual-accept + follow-up note  
- [x] `cms.components` catalog keys still resolve string `.editor(…)` bindings  
- [x] Demo `check` green

## Notes

Do not pass `schema` / `location` on the Astro face.

## Delivered

- `defineCms` options: `{ form?, previewUrl?, type? }` — path-map `ui` **removed** (not dual-accepted)
- `form`: `FormTree` or `(f: ScopedFormTreeHelpers<Data>) => FormTree` (helpers from `createScopedFormTreeHelpers` / re-exported via `@cms/astro/config`)
- `DefineCmsResult.forms` → `virtual:@cms/config` → `loadShellFormModels` → `projectSchemaFormModels({ forms })`
- Overlay demo: posts use `tabs` (content / media); authors keep `.editor("AuthorNameEditor")`
