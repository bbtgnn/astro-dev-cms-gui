# 15 — Non-Astro `defineCms` on `@cms/core`

Type: task  
Status: open  
Blocked by: [13](./13-task-form-tree-to-form-model.md)

## Goal

Portable helper face: `defineCms(cms => record of cms.collection({ schema, location, form, … }))`. Builds presentation + data needed for `createCmsHost` descriptors. No `@cms/astro`, no content-proxy requirement.

## Acceptance

- [ ] `defineCms((cms) => ({ … }))` exported from `@cms/core` (subpath OK)  
- [ ] `cms.collection({ schema, location, form?, previewUrl?, type? })` with `ui`/chrome typed via `z.input<typeof schema>` through form tree  
- [ ] Leaf helpers: `cms.image()`, `cms.file()`, `cms.reference("col")` — stamped + brands for kinds / ChromeFor  
- [ ] Result exposes enough to build `CollectionDescriptor[]` (name, schema, base/location) + form trees / overlays  
- [ ] Location stays on the collection helper — not a separate host-only-only secret (host still calls `createCmsHost`; sugar may wrap)  
- [ ] Tests without Astro; ticket 10 stub superseded for implementation intent (exploration still no GitHub #1 edit)  
- [ ] Document: Astro face remains on `@cms/astro/config` and does not take schema/location

## Notes

i18n helper deferred. Optional later: `cmsCollection` sugar alias — not required here.
