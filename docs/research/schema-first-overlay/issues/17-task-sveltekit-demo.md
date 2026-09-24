# 17 — `demos/sveltekit` non-Astro demo

Type: task  
Status: resolved  
Blocked by: [15](./15-task-non-astro-definecms.md), [16](./16-task-demos-workspace.md)

## Goal

Full SvelteKit self-host app proving non-Astro `defineCms` + form tree + `createCmsHost` write-back without `@cms/astro`.

## Acceptance

- [x] Workspace package under `demos/sveltekit` (e.g. `@cms/sveltekit-demo`)  
- [x] One module (e.g. `src/cms.ts`) with non-Astro `defineCms(cms => …)` including schema, location, form tree (tabs and/or columns), at least one stamped image or reference leaf  
- [x] Catalog map for at least one custom editor (string key); co-located or sibling module OK  
- [x] `/cms` (or agreed route) mounts authoring shell against in-app host  
- [x] FS Writer under `./data` or `./content` (JSON entries)  
- [x] `bun run --filter @cms/sveltekit-demo dev` smoke: list/edit/save  
- [x] README: demo fixture, not a product template; no Astro  
- [x] Root script optional: `dev:kit`  

## Notes

Does not use content-proxy or `cms()`. Protocol + form models only.

## Delivered

- `@cms/sveltekit-demo` at `demos/sveltekit`
- `src/lib/cms.ts` — `defineCms` with authors + posts (tabs, columns, `cms.image` / `cms.reference`, `AuthorNameEditor` key)
- `src/lib/cms-components.ts` + `AuthorNameEditor.svelte` catalog
- `/cms` — `AuthoringApp` + `authoringPropsFromDefineCms` (`ssr = false`)
- `/_cms` — thin dispatcher via `hooks.server.ts` (SvelteKit `_` dirs are private)
- `createCmsHost` + `nodeFsWriter` over `./data`
- Root `dev:kit`; README marks demo fixture / no Astro
