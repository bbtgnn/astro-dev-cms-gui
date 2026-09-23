# 08 — Remove generation + IR `defineCms` dead code

Type: task  
Status: resolved  
Blocked by: [06](./06-task-demo-simple.md), [07](./07-task-demo-overlay.md)

## Goal

Delete or quarantine product paths that assume CMS-first generation / user-authored semantic tree on the Astro happy path, once demos are green.

## Acceptance

- [x] Product exports no longer advertise `cms generate` / `@cms/astro/generate` as happy path (remove bin generate or hard-fail with “removed on this branch” only if needed for leftover scripts)
- [x] Remove or relocate `packages/astro/src/generate/**` and generation tests
- [x] Old IR builder `defineCms((s) => …)` removed from `@cms/astro/config` or clearly non-exported
- [x] `buildDefaultFsHost` IR-tree input replaced or deleted in favor of stamped-host builder from 04
- [x] Workspace `check` scripts no longer run obsolete generate tests
- [x] No demo still depends on generated content.config hash headers

## Notes

`@cms/core/semantic` may remain for internal projection; this ticket is about **Astro product surface** and demos, not necessarily deleting the entire semantic package in one go. If semantic is unused after flip, note follow-up — do not block on a core rewrite.

## Done (ticket 08)

- Deleted `packages/astro/src/generate/**`, `@cms/astro/generate` export, IR `buildDefaultFsHost`, `defineCmsIr`.
- CLI `cms generate` hard-fails (“removed on this branch”) for leftover template scripts (09 deletes package).
- Product host face: `buildFsHostFromStampedCollections` / `defineCms(collections, overlay)` only.
- Follow-up: `@cms/core/semantic` still used for form projection / overlay types — not deleted.
- Template package deletion + workspace docs: ticket [09](./09-task-workspace-docs-rename.md).
