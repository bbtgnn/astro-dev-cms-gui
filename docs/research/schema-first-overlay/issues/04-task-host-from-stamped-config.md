# 04 — Host from stamped `content.config`

Type: task  
Status: resolved  
Blocked by: [02](./02-task-content-proxy.md), [03](./03-task-schema-form-projection.md)

## Goal

Replace IR-based `buildDefaultFsHost` assembly with: load stamped collections from user `content.config` → location descriptors (ADR-0007) + authoritative Input validator + form models from 03.

## Context

Today: `packages/astro/src/build-default-fs-host.ts` compiles semantic tree, maps glob bases, `createAuthoritativeValidator(ir)`.  
Target: stamps → write bases / allowPaths; validate via live schema; descriptors for `createCmsHost`.

## Acceptance

- [x] Host-side load of `src/content.config.*` with proxy/shims active (Vite SSR and/or emit)
- [x] Read `LOADER_STAMP` (or equiv) → collection location for list/create/save
- [x] `file()` collections handled or explicitly unsupported with clear error
- [x] Authoritative validate uses schema Input parse (async OK)
- [x] Image/ref protocol values remain persisted Input (paths / ids)
- [x] Tests with in-memory Writer mirroring authors/posts layout
- [x] Escape: missing stamp → fail closed or require explicit location (document choice)

## Notes

Keep `createCmsHost` / protocol unchanged where possible. Export new builder from `@cms/astro/testing` for demos/tests.

## Delivered

- `@cms/astro/testing`: `collectionsFromContentConfigExport`, `buildFsHostFromStampedCollections`
  (`packages/astro/src/build-fs-host-from-stamped.ts`)
- IR `buildDefaultFsHost` kept for ticket 05 flip
- **Escape choice: fail closed** — missing `LOADER_STAMP` throws unless
  `locations[name] = { base }` is provided; `file()` unsupported with clear error
- Load path: Vite SSR of content.config with content-proxy boot, then
  `collectionsFromContentConfigExport(mod)`; tests use shimmed fixtures
- Authoritative schemas rewrite stamped image/ref → Input strings (+ host
  existence checks); `stampedSchemas` returned for ticket 03 form projection
- Tests: `bun run --filter @cms/astro test:stamped-host`
