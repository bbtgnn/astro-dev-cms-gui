# 15 — Non-Astro `defineCms` on `@cms/core`

Type: task  
Status: resolved  
Blocked by: [13](./13-task-form-tree-to-form-model.md)

## Goal

Portable helper face: `defineCms(cms => record of cms.collection({ schema, location, form, … }))`. Builds presentation + data needed for `createCmsHost` descriptors. No `@cms/astro`, no content-proxy requirement.

## Acceptance

- [x] `defineCms((cms) => ({ … }))` exported from `@cms/core` (subpath OK)  
- [x] `cms.collection({ schema, location, form?, previewUrl?, type? })` with `ui`/chrome typed via `z.input<typeof schema>` through form tree  
- [x] Leaf helpers: `cms.image()`, `cms.file()`, `cms.reference("col")` — stamped + brands for kinds / ChromeFor  
- [x] Result exposes enough to build `CollectionDescriptor[]` (name, schema, base/location) + form trees / overlays  
- [x] Location stays on the collection helper — not a separate host-only-only secret (host still calls `createCmsHost`; sugar may wrap)  
- [x] Tests without Astro; ticket 10 stub superseded for implementation intent (exploration still no GitHub #1 edit)  
- [x] Document: Astro face remains on `@cms/astro/config` and does not take schema/location

## Notes

i18n helper deferred. Optional later: `cmsCollection` sugar alias — not required here.

## Delivered

- `@cms/core/define-cms` (+ re-export from `@cms/core`): `defineCms((cms) => …)`
- `cms.collection({ schema, location, form?, previewUrl?, type? })` — form via `ScopedFormTreeHelpers<z.input<Schema>>`
- Leaf stamps reuse `CONTENT_FIELD_STAMP` (`image` / `file` / `reference`); brands `CmsImage` / `CmsFile` / `CmsReference` + `ChromeFor`
- Result: `collections`, `descriptors`, `schemas`, `forms`, `types`, `getPreviewUrl`
- Astro face stays options-only on `@cms/astro/config` (no schema/location) — see module docstring on `packages/core/src/define-cms.ts`
- Ticket 10 “host-only location” superseded for this helper face (location on `cms.collection`)
