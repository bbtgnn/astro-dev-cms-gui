# 06 — `@cms/astro-demo-simple`

Type: task  
Status: resolved  
Blocked by: [05](./05-task-flip-cms-integration.md)

## Goal

First demo package: native Astro `content.config` only, `cms()` in `astro.config`, **no** `cms.config` / `cms.components`. Proves simple integration ladder.

## Acceptance

- [x] Workspace package `@cms/astro-demo-simple` (not named template)
- [x] Hand-authored `src/content.config.ts` with authors/posts (glob JSON, `image`, `reference`) — not generated
- [x] Sample content + minimal site pages for preview if needed
- [x] `bun run --filter @cms/astro-demo-simple dev` → `/cms` lists/edits with stock editors; write-back works
- [x] No `src/cms.config.ts` / `cms.components.ts`
- [x] Package README states: demo / self-host fixture, not a starter to copy

## Notes

Seeded from former `packages/astro-template` content + pages; CMS IR config stripped. Template package removed in [09](./09-task-workspace-docs-rename.md).

## Done

- Package: `packages/astro-demo-simple`
- Exported `authorsSchema` / `postsSchema` for ticket 07 dual registration
- Root `workspaces` + `check` / `dev` filters: see [09](./09-task-workspace-docs-rename.md)
