# 12 — Form tree builders (`@cms/core`)

Type: task  
Status: resolved  
Blocked by: [11](./11-research-form-tree-non-astro.md)

## Goal

Ship the public form-tree construction API in `@cms/core`: fluent field refs, tabs/columns/group, scoped helpers for nested objects. Presentation only — no Zod authority, no live Svelte.

## Acceptance

- [x] `field(key)` fluent chrome (`.label`, `.editor`, `.kind`, …) typed against a `Data` type parameter  
- [x] `tabs([{ id, label?, content }])` — tab entries are objects, not `tab()` functions  
- [x] `columns([ [...], [...] ])` — no singular `column()` wrapper  
- [x] `group({ label?, content })`  
- [x] Object field: `.fields((f) => …)` and `.form((f) => …)` rebind `f` to `keyof` object Input  
- [x] Layout containers do not change key space (same `field` / `f` inside tabs/columns)  
- [x] Unit tests for typing intent (compile-time fixtures or expect-type) + runtime node shape  
- [x] Not the deleted IR `s.field` algebra; document “field ref” in module docs

## Notes

Astro path will pass `Data` from `CmsCollections[K]`; non-Astro from `z.input<S>`.

## Delivered

- Module: `packages/core/src/form-tree.ts`
- Exports: `@cms/core` / `@cms/core/form-tree` via `createFormTreeHelpers<Data>()`
- Tests: `scripts/form-tree.test.ts` (runtime) + `scripts/form-tree.fixtures.ts` (compile-time)
- Chrome lives on `node.chrome` so fluent `.label` / `.editor` / `.kind` do not clash with data props
