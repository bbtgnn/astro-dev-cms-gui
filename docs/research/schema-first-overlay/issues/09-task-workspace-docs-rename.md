# 09 — Workspace rename, scripts, light docs

Type: task  
Status: resolved  
Blocked by: [06](./06-task-demo-simple.md), [07](./07-task-demo-overlay.md)

## Goal

Finish rename away from `astro-template`; point root scripts at demos; light CONTEXT/AGENTS updates so agents find the right packages. No GitHub #1.

## Acceptance

- [x] `packages/astro-template` removed after demos exist
- [x] Root `package.json` workspaces + `dev` / `build` / `check` / filters updated
- [x] CONTEXT.md + AGENTS.md: “reference host” / `@cms/astro-template` → demo package names; note exploration vs ADR-0019 on this branch
- [x] README package graph updated
- [x] Cross-links in research notes updated if they cite `astro-template` as the live demo
- [x] `bun run check` (and allowlist/lint if applicable) pass

## Notes

Full glossary / ADR supersede is out of scope (later, if flip merges).

## Done

- Removed `packages/astro-template`
- Root scripts: `dev` → `@cms/astro-demo-simple`; `dev:overlay` → `@cms/astro-demo`; `build` / `check` cover both demos; dropped `check:image`
- CONTEXT / AGENTS / README / spec + research notes updated; ADRs left historical
