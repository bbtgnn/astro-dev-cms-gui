# Plan — form tree, non-Astro defineCms, demos/

**Status:** planned (grill settled 2026-09-23)  
**Branch:** `explore/schema-first-overlay`  
**Parent:** [plan.md](./plan.md) (Astro happy-path flip — done), [map.md](./map.md)  
**Authority:** exploration only. Does not supersede ADRs / GitHub #1.

## Goal

1. **Form tree** — one fluent presentation structure (layout + field refs) shared by Astro overlay and non-Astro hosts  
2. **Non-Astro `defineCms`** — unique helper face on `@cms/core` (`schema` + `location` + `form` + leaf stamps)  
3. **Top-level `demos/`** — self-host apps live under `demos/`, not `packages/`; add a SvelteKit non-Astro demo

## Settled decisions (grill)

| Topic | Decision |
| --- | --- |
| Presentation shape | One **form tree** (not separate `ui` + `layout` maps) |
| `cms.field` | Typed **field ref** into schema Input keys — not Field schema / IR `s.field` |
| Object nesting | Callback scope: `.fields((f) => …)` / `.form((f) => …)` (bare nested `cms.field` does not rebind types) |
| Tabs | Object literals `{ id, label?, content }[]` — no `cms.tab()` |
| Columns | Arrays of child arrays — no `cms.column()` |
| Group | `cms.group({ label?, content })` in v1 for sibling bundles that aren’t one Zod object |
| Layout v1 | `stack` (default), `tabs`, `columns`, `group` |
| Astro `defineCms` | Options-only; schemas from `content.config`; types from `cms.types.d.ts`; gains `form` |
| Non-Astro `defineCms` | `defineCms(cms => ({ name: cms.collection({ schema, location, form, … }) }))` on **`@cms/core`** |
| Leaf helpers | `cms.image` / `cms.file` / `cms.reference` (+ i18n later) on non-Astro helper |
| Custom editors | String catalog keys on the form tree; live Svelte via catalog map (co-locate OK on non-Astro) |
| Demos location | Top-level **`demos/`** workspace members (not under `packages/`) |
| Non-Astro demo | Full **SvelteKit** app under `demos/sveltekit` |

## Non-goals

- Superseding ADR-0019 / editing GitHub #1  
- Accordion, blocks, i18n layout in v1  
- Live Svelte values inside the form tree  
- Perfect Astro `z.input` without codegen (Astro keeps `cms.types.d.ts`)

## Architecture

```text
@cms/core
  form tree builders (field fluent, tabs/columns/group, scoped f)
  non-Astro defineCms(cms => …) → schemas + locations + form trees
  project schema + form tree → CollectionFormModel
        │
        ├──── @cms/astro/config ── Astro defineCms({ form }) + cms.types.d.ts
        │         content.config + content-proxy (unchanged authority)
        │
        └──── demos/
                astro-simple / astro-overlay   (migrate from packages/)
                sveltekit                      (new; no @cms/astro)
```

## Sequencing

```text
11 decisions lock (this note)
        │
        ▼
12 form tree builders (@cms/core) ──► 13 lower form tree → form model layout
        │                                      │
        ├──────────────────────────────────────┤
        ▼                                      ▼
14 Astro defineCms `form`              15 non-Astro defineCms + leaf helpers
        │                                      │
        └──────────────► 16 demos/ workspace + migrate Astro demos
                                       │
                                       ▼
                               17 demos/sveltekit
```

`14` and `15` can parallel after `13`. `16` can start scaffolding `demos/` once workspace policy is clear; finish migrate after Astro `form` works. `17` needs `15` + `16`.

## Acceptance (whole phase)

- [ ] Form tree with tabs (objects), columns (arrays), group, object callback scopes — typed field refs  
- [ ] Schema-first projection applies form tree layout (unplaced keys → default stack)  
- [ ] Astro overlay demo uses `form` (or dual-accept during migrate)  
- [ ] Non-Astro `defineCms` on `@cms/core` joins schema + location + form → host descriptors  
- [ ] Workspace: product libs in `packages/`; self-host apps in `demos/`  
- [ ] `bun run --filter @cms/sveltekit-demo dev` → `/cms` edits FS-backed entries without Astro  
- [ ] GitHub #1 unchanged; no superseding ADR in these tickets

## Tickets

| ID | File | Type | Blocked by |
| --- | --- | --- | --- |
| 11 | [issues/11-research-form-tree-non-astro.md](./issues/11-research-form-tree-non-astro.md) | research | — |
| 12 | [issues/12-task-form-tree-builders.md](./issues/12-task-form-tree-builders.md) | task | 11 |
| 13 | [issues/13-task-form-tree-to-form-model.md](./issues/13-task-form-tree-to-form-model.md) | task | 12 |
| 14 | [issues/14-task-astro-definecms-form.md](./issues/14-task-astro-definecms-form.md) | task | 13 |
| 15 | [issues/15-task-non-astro-definecms.md](./issues/15-task-non-astro-definecms.md) | task | 13 |
| 16 | [issues/16-task-demos-workspace.md](./issues/16-task-demos-workspace.md) | task | 11 |
| 17 | [issues/17-task-sveltekit-demo.md](./issues/17-task-sveltekit-demo.md) | task | 15, 16 |
