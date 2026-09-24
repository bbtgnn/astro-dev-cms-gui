# Schema-first overlay — local map (accepted)

**Status:** exploration **accepted** as product law via
[ADR-0025](../../adr/0025-schema-first-content-config-optional-overlay.md).
GitHub wayfinder map [#1](https://github.com/bbtgnn/astro-dev-cms-gui/issues/1)
updated to match. Branch history: `explore/schema-first-overlay`.

**Tracker:** this folder remains research/history; authority is ADRs + map #1.

## Destination (landed)

User-authored Astro `content.config` (Standard Schema Input) is validation +
location authority; `@cms/astro` intercepts loaders/`image`/`reference` via
content-proxy; optional `defineAstroCms` overlay for presentation; self-host
apps under top-level `demos/`; portable `defineCms` on `@cms/core` with a
SvelteKit demo. No generated `content.config` on product `cms()`.

## Notes

- Research: [schema-first-overlay.md](../schema-first-overlay.md), [astro-loader-extraction.md](../astro-loader-extraction.md)
- Astro flip plan: [plan.md](./plan.md) (tickets 01–10 — done)
- Form-tree phase: [plan-form-tree-and-non-astro.md](./plan-form-tree-and-non-astro.md) (tickets 11–17 — done)
- **IR authoring face stripped** (`s.field` / `compileSemanticIr` / IR→form projections). Schema-first + form tree + `CollectionFormModel` remain.
- Codegen Input types: [codegen-input-types-plan.md](./codegen-input-types-plan.md)

## Decisions (now ADR-backed)

- Schema-first + optional CMS overlay; JSON Schema is form wire, not public seam.
- Astro Input for CMS values; Output is render-only.
- Image/ref kinds via stamp/proxy; layout/singleton/editors via form tree — not FieldUi-on-Zod.
- Astro `defineAstroCms(options)` presentation-only; schemas from content.config.
- Portable `defineCms` on `@cms/core`; demos under `demos/`.
- Full happy-path flip of `cms()` (kill generation) — ADR-0025.

## Out of scope here (unchanged)

- Accordion / blocks / i18n layout in form-tree v1
- MD/MDX body serialization, hosted git CMS
