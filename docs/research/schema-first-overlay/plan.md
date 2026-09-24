# Plan — schema-first happy-path flip

**Status:** happy-path flip executed on branch (demos 06/07 + rename 09 + generate removal 08 resolved); remaining research stubs only  
**Branch:** `explore/schema-first-overlay`  
**Map:** [map.md](./map.md)

## Goal

Replace CMS-first IR → generate `content.config` with:

1. User-authored Astro `content.config` (schemas + loaders)
2. `@cms/astro` content-proxy stamps (`astro/loaders` + `astro:content` for `reference` / function-schema `image`)
3. Host join: stamped location + schema Input → protocol descriptors + authoritative validate
4. Form models from schema → JSON Schema (+ optional overlay ui)
5. Optional `defineCms(collections, overlay)` + `cms.components`
6. Two demos; remove `@cms/astro-template`

## Non-goals (this plan)

- Publishing a superseding ADR / editing GitHub #1
- Shipping non-Astro location API beyond a tracked stub
- Preserving generation as a supported happy path
- Perfect custom-loader coverage (explicit location escape is enough)

## Current → target

| Today (ADR-0019) | Target (this branch) |
| --- | --- |
| `cms.config` unified tree required | Overlay optional |
| Generate `src/content.config.ts` | User owns `content.config`; no generate in `cms()` |
| Host from `compileSemanticIr` | Host from stamped collections + Zod/Standard Schema Input parse |
| Form via `projectFormModels(ir)` | Form via schema→JSON Schema (+ overlay); thin internal IR OK if useful |
| `@cms/astro-template` | `@cms/astro-demo-simple` + `@cms/astro-demo` |

## Architecture (happy path)

```text
src/content.config.ts          src/cms.config.ts? (optional)
  defineCollection +             defineCms(collections, overlay)
  glob/file + schema               nested fields / singleton / editors
         │                                    │
         ▼                                    ▼
  Vite: content-proxy stamps          Vite: virtual:@cms/config (+ components)
  (astro/loaders, astro:content)
         │                                    │
         └────────── host join ───────────────┘
                        │
         collection descriptors + form models
                        │
              createCmsHost / /_cms / /cms shell
```

**Layers (unchanged ADR-0008):** authoring UI ↔ protocol ↔ host. Browser never imports `content.config`.

## Workstreams

### A — Content proxy (`@cms/astro`)

Port/adapt zod-decap boot:

- Vite `enforce: "pre"` proxy for `astro:content` (`reference`, wrap `defineCollection` schema ctx `image`)
- Alias/shim for `astro/loaders` (`glob`/`file` → `LOADER_STAMP`)
- Optional esbuild emit load for CLI/host-without-Vite later (can follow demo boot)
- Symbol stamps readable only on host/Node

**Prior art:** `astro-decap-github-connect/packages/zod-decap-local/src/content-proxy/` (`boot.ts`, `stamps.ts`, `stamp-helpers.ts`, `shims/`, `image-bridge` patterns).

### B — Schema → form + validate

- Project Zod (or Standard Schema) **Input** to Ajv-safe JSON Schema for SJSF
- Map stamped image/ref → form field kinds / stock editors
- Authoritative validate = schema `.parse` / Standard Schema validate on server (not IR validator)
- Apply optional overlay (paths nested → uiSchema / bindings / singleton)

May keep a **thin internal** form IR as compile artifact; must not be user-authored algebra.

### C — Flip `cms()` happy path

- Install content-proxy in `astro:config:setup`
- **Remove** `generateContentConfig` from product `cms()`
- `cms.config` / components: optional; missing → stock forms
- Default host: load stamped `content.config` + optional overlay → `buildDefaultFsHost`-equivalent
- Soft-delete or quarantine `packages/astro/src/generate/**`, `bin/cms.ts` generate, IR `defineCms` builders — replace with new `defineCms(collections, config)`
- Update harness: no `requireConfig`; `generate: false` becomes default/no-op
- Rewrite tests that assume generation/IR

### D — Demos

| Package | Role |
| --- | --- |
| `@cms/astro-demo-simple` | Native `content.config` only; `cms()`; no `cms.config` / components; stock editors |
| `@cms/astro-demo` | Same content + `cms.config` overlay + `cms.components` (custom editors, labels, singleton flag demo if useful) |

Migrate useful bits from the former `packages/astro-template` (pages, content JSON, image assets, shell). **Done:** template deleted; demos are the reference hosts (ticket 09).

Root scripts: `dev` / `check` point at demos (simple as default `dev`, or both filters).

### E — Docs touch (light)

- CONTEXT / AGENTS: reference host → demo packages; note exploration branch vs ADR-0019
- Package READMEs
- Do **not** edit map #1 or supersede ADRs in this plan’s tickets (optional later ticket)

### F — Non-Astro stub

One ticket: document `{ schema, location }` / alternate `defineCms` overload as follow-up; no implementation required to close the Astro flip.

## Sequencing (dependency order)

```text
01 research lock (done) ──┐
02 content-proxy          ├──► 04 host-from-content-config
03 schema→form projection ┘            │
                                       ▼
                         05 flip cms() happy path
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
            06 demo-simple      07 demo-overlay     08 remove generate/IR dead code
                    │                  │                  │
                    └────────────► 09 workspace rename/scripts/docs
                                       │
                                       ▼
                               10 non-astro stub (can parallel after 05)
```

Tickets `02` and `03` can parallel. `06` needs `05` (or a thin spike harness). Prefer `06` before `07`. `08` after demos green so nothing still imports generate.

## Acceptance (whole plan)

- [ ] `bun run --filter @cms/astro-demo-simple dev` → `/cms` edits entries with stock forms; writes under `src/content`; no `cms.config`
- [ ] `bun run --filter @cms/astro-demo dev` → custom editors / overlay work; native `content.config` is schema authority
- [ ] `cms()` does not write `content.config`
- [ ] Stamped `glob` base drives write paths (ADR-0007 behavior preserved)
- [ ] `image()` / `reference()` get correct stock (or overlay) editors
- [ ] `bun run check` / lint green for workspace after package renames
- [ ] GitHub #1 unchanged

## Risks

| Risk | Mitigation |
| --- | --- |
| Proxy boot order vs Content Layer | Fixture logging stamps on first sync (extraction research open Q) |
| Zod→JSON Schema lossiness | Stamps for image/ref; overlay escape; accept Ajv≠Zod |
| Large IR surface still in core | Quarantine user-facing IR; don’t rewrite all of `@cms/core/semantic` in one ticket unless required for form path |
| Demo rename breaks filters/CI | Single ticket for workspace + scripts |

## Tickets

| ID | File | Type | Blocked by |
| --- | --- | --- | --- |
| 01 | [issues/01-research-done.md](./issues/01-research-done.md) | research | — |
| 02 | [issues/02-task-content-proxy.md](./issues/02-task-content-proxy.md) | task | 01 |
| 03 | [issues/03-task-schema-form-projection.md](./issues/03-task-schema-form-projection.md) | task | 01 |
| 04 | [issues/04-task-host-from-stamped-config.md](./issues/04-task-host-from-stamped-config.md) | task | 02, 03 |
| 05 | [issues/05-task-flip-cms-integration.md](./issues/05-task-flip-cms-integration.md) | task | 04 |
| 06 | [issues/06-task-demo-simple.md](./issues/06-task-demo-simple.md) | task | 05 |
| 07 | [issues/07-task-demo-overlay.md](./issues/07-task-demo-overlay.md) | task | 05, 06 |
| 08 | [issues/08-task-remove-generate-and-ir-definecms.md](./issues/08-task-remove-generate-and-ir-definecms.md) | task | 06, 07 |
| 09 | [issues/09-task-workspace-docs-rename.md](./issues/09-task-workspace-docs-rename.md) | task | 06, 07 |
| 10 | [issues/10-stub-non-astro-location-api.md](./issues/10-stub-non-astro-location-api.md) | research | 01 |

`09` may merge with rename steps inside `06`/`07` if cleaner; keep as checklist owner for CONTEXT/AGENTS/root package.json.

## Next phase

Form tree + non-Astro `defineCms` + top-level `demos/`: see [plan-form-tree-and-non-astro.md](./plan-form-tree-and-non-astro.md) (tickets 11–17).
