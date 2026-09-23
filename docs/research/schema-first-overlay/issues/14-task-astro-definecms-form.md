# 14 — Astro `defineCms` gains `form`

Type: task  
Status: open  
Blocked by: [13](./13-task-form-tree-to-form-model.md)

## Goal

Astro options-only `defineCms` accepts a per-collection **form tree** typed from `CmsCollections` / `cms.types.d.ts`. Schemas stay in `content.config`. Migrate overlay demo off path-map `ui` (or dual-accept briefly).

## Acceptance

- [ ] `defineCms({ posts: { form, previewUrl?, type? } })`  
- [ ] `form` builders scoped so `field("…")` keys are `keyof CmsCollections["posts"]`  
- [ ] Shell form models use form tree when present  
- [ ] Overlay demo (`demos/astro-overlay` or current package until 16) uses tabs or group at least once  
- [ ] Path-map `ui` deprecated or removed in the same PR if cheap; else dual-accept + follow-up note  
- [ ] `cms.components` catalog keys still resolve string `.editor(…)` bindings  
- [ ] Demo `check` green

## Notes

Do not pass `schema` / `location` on the Astro face.
