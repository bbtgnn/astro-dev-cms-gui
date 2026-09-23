# 12 — Form tree builders (`@cms/core`)

Type: task  
Status: open  
Blocked by: [11](./11-research-form-tree-non-astro.md)

## Goal

Ship the public form-tree construction API in `@cms/core`: fluent field refs, tabs/columns/group, scoped helpers for nested objects. Presentation only — no Zod authority, no live Svelte.

## Acceptance

- [ ] `field(key)` fluent chrome (`.label`, `.editor`, `.kind`, …) typed against a `Data` type parameter  
- [ ] `tabs([{ id, label?, content }])` — tab entries are objects, not `tab()` functions  
- [ ] `columns([ [...], [...] ])` — no singular `column()` wrapper  
- [ ] `group({ label?, content })`  
- [ ] Object field: `.fields((f) => …)` and `.form((f) => …)` rebind `f` to `keyof` object Input  
- [ ] Layout containers do not change key space (same `field` / `f` inside tabs/columns)  
- [ ] Unit tests for typing intent (compile-time fixtures or expect-type) + runtime node shape  
- [ ] Not the deleted IR `s.field` algebra; document “field ref” in module docs

## Notes

Astro path will pass `Data` from `CmsCollections[K]`; non-Astro from `z.input<S>`.
