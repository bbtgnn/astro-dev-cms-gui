# 07 — `@cms/astro-demo` (overlay + components)

Type: task  
Status: resolved  
Blocked by: [05](./05-task-flip-cms-integration.md), [06](./06-task-demo-simple.md)

## Goal

Second demo: same native schemas/content as simple (or shared fixtures), plus `cms.config.ts` + `cms.components.ts` using `defineCms(collections, overlay)` with nested field scoping and at least one custom editor.

## Acceptance

- [x] Workspace package `@cms/astro-demo`
- [x] Native `content.config` (shared schemas with simple if practical)
- [x] `defineCms(collections, { … })` — multi-collection; nested object field chrome; no IR `s.field` algebra as authority
- [x] Custom editor via `cms.components` catalog (e.g. author name)
- [x] Optional: singleton editor flag demonstrated if cheap
- [x] `bun run --filter @cms/astro-demo dev` → overlay editors work; validation still Astro/Zod Input
- [x] README: demo fixture, not template

## Notes

Prefer importing the same schema record into both `content.config` and `defineCms` first arg.

## Done

- Package: `packages/astro-demo` (port 4322)
- Shared schemas: `@cms/astro-demo-simple/schemas` (`authorsSchema`, `postsSchema`, `postsSchemaInput` + nested `seo`)
- Overlay: labels, nested `seo.description` chrome, `AuthorNameEditor` catalog binding, `getPreviewUrl`
- Singleton skipped — `CollectionConfig.kind: "singleton"` still reserved / unimplemented (not cheap)
- Smoke: `/cms` 200 with overlay form models; invalid `PUT` → 400
