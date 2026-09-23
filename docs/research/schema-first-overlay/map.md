# Schema-first overlay — local map (exploration)

**Branch:** `explore/schema-first-overlay`  
**Tracker:** local markdown under `docs/research/schema-first-overlay/` (not GitHub map #1).  
**Authority:** exploration only. Does not supersede ADRs until an explicit ADR says so.

## Destination

Full happy-path flip: user’s Astro `content.config` (Standard Schema Input) is validation + location authority; `@cms/astro` intercepts loaders/`image`/`reference` via content-proxy; optional `defineCms` overlay for presentation; self-host apps under top-level `demos/`; portable non-Astro `defineCms` on `@cms/core` with a SvelteKit demo. No generated `content.config` on product `cms()`.

## Notes

- Research: [schema-first-overlay.md](../schema-first-overlay.md), [astro-loader-extraction.md](../astro-loader-extraction.md)
- Astro flip plan: [plan.md](./plan.md) (tickets 01–10 — largely done)
- Form-tree phase: [plan-form-tree-and-non-astro.md](./plan-form-tree-and-non-astro.md) (tickets 11–17 — implemented on this branch)
- **IR authoring face stripped** on this branch (`s.field` / `compileSemanticIr` / `createCmsBuilders` / IR→form projections / IR validator). Schema-first + form tree + `CollectionFormModel` remain.
- Breakage on this branch is accepted (Q22).
- Do not edit GitHub wayfinder map #1 while exploring.

## Decisions so far

- Schema-first + CMS overlay (sharper model); JSON Schema is form wire, not public seam.
- Astro Input for CMS values; Output is render-only.
- Image/ref kinds via stamp/proxy (astro-decap style); layout/singleton/editors via overlay — not FieldUi-on-Zod.
- Astro `defineCms(options)` presentation-only; schemas from content.config; types via `cms.types.d.ts` module augmentation.
- Options-only cleanup: no collections arg on Astro face; host reads stamped content.config.
- **Form tree:** one fluent structure (field refs + tabs/columns/group); tabs as objects; object enter = callback scope; lowers into `CollectionFormModel`.
- **Non-Astro** `defineCms(cms => …)` on `@cms/core` with schema + location + form + leaf helpers.
- **demos/** top-level for self-host apps (`astro-simple`, `astro-overlay`, `sveltekit`); `packages/` for libraries only.
- `defineCms` optional; singleton = editor flag; id↔path = host (ADR-0007).
- Full happy-path flip of `cms()` (kill generation); Q19–Q23 locked in parent research note.

## Frontier (local tickets)

**Form-tree phase (11–17) done** on this branch — see [plan-form-tree-and-non-astro.md](./plan-form-tree-and-non-astro.md).

Prior phase tickets 01–10: see [plan.md](./plan.md). Codegen Input types: [codegen-input-types-plan.md](./codegen-input-types-plan.md) (implemented; Astro uses `form`, not path-map `ui`).

## Out of scope here

- Superseding ADR-0019 on `main` / map #1
- Accordion / blocks / i18n layout in form-tree v1
- MD/MDX body serialization, hosted git CMS
