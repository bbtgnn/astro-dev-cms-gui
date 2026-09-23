# 17 — `demos/sveltekit` non-Astro demo

Type: task  
Status: open  
Blocked by: [15](./15-task-non-astro-definecms.md), [16](./16-task-demos-workspace.md)

## Goal

Full SvelteKit self-host app proving non-Astro `defineCms` + form tree + `createCmsHost` write-back without `@cms/astro`.

## Acceptance

- [ ] Workspace package under `demos/sveltekit` (e.g. `@cms/sveltekit-demo`)  
- [ ] One module (e.g. `src/cms.ts`) with non-Astro `defineCms(cms => …)` including schema, location, form tree (tabs and/or columns), at least one stamped image or reference leaf  
- [ ] Catalog map for at least one custom editor (string key); co-located or sibling module OK  
- [ ] `/cms` (or agreed route) mounts authoring shell against in-app host  
- [ ] FS Writer under `./data` or `./content` (JSON entries)  
- [ ] `bun run --filter @cms/sveltekit-demo dev` smoke: list/edit/save  
- [ ] README: demo fixture, not a product template; no Astro  
- [ ] Root script optional: `dev:kit`  

## Notes

Does not use content-proxy or `cms()`. Protocol + form models only.
