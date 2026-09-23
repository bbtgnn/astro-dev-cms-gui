# 16 — Top-level `demos/` workspace

Type: task  
Status: open  
Blocked by: [11](./11-research-form-tree-non-astro.md)

## Goal

Product libraries stay under `packages/`. Self-host validation apps move to top-level **`demos/`**. Update workspaces, scripts, CONTEXT/AGENTS references.

## Acceptance

- [ ] Create `demos/` and register workspace members there  
- [ ] Move `@cms/astro-demo-simple` → `demos/astro-simple` (package name TBD; keep or rename filter)  
- [ ] Move `@cms/astro-demo` → `demos/astro-overlay` (same)  
- [ ] Root `package.json` workspaces + `dev` / `dev:overlay` / `check` / `build` paths updated  
- [ ] READMEs + AGENTS/CONTEXT **Reference host** paths updated  
- [ ] CI / allowlists if they hardcode `packages/astro-demo*`  
- [ ] `bun install` + `bun run check` green after move  
- [ ] No product `@cms/*` library relocated out of `packages/`

## Notes

Can land before 14/15; coordinate package renames with 14’s demo edits. Prefer short folder names: `demos/astro-simple`, `demos/astro-overlay`, `demos/sveltekit`.
