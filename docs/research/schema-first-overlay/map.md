# Schema-first overlay — local map (exploration)

**Branch:** `explore/schema-first-overlay`  
**Tracker:** local markdown under `docs/research/schema-first-overlay/` (not GitHub map #1).  
**Authority:** exploration only. Does not supersede ADRs until an explicit ADR says so.

## Destination

Full happy-path flip: user’s Astro `content.config` (Standard Schema Input) is validation + location authority; `@cms/astro` intercepts loaders/`image`/`reference` via content-proxy; optional `defineCms(collections, overlay)` for presentation; two demo packages (simple + overlay); no generated `content.config` on product `cms()`.

## Notes

- Research: [schema-first-overlay.md](../schema-first-overlay.md), [astro-loader-extraction.md](../astro-loader-extraction.md)
- Full plan: [plan.md](./plan.md)
- Breakage on this branch is accepted (Q22).
- Do not edit GitHub wayfinder map #1 while exploring.

## Decisions so far

- Schema-first + CMS overlay (sharper model); JSON Schema is form wire, not public seam.
- Astro Input for CMS values; Output is render-only.
- Image/ref kinds via stamp/proxy (astro-decap style); layout/singleton/editors via overlay — not FieldUi-on-Zod.
- `defineCms(collections, config)` multi-collection; nested field scoping; same shape Astro + non-Astro (location API differs).
- `defineCms` optional; singleton = editor flag; id↔path = host (ADR-0007).
- Two demos: `@cms/astro-demo-simple`, `@cms/astro-demo`; rename away from “template”.
- Full happy-path flip of `cms()` (kill generation); Q19–Q23 locked in parent research note.

## Frontier (local tickets)

See task list in [plan.md](./plan.md) § Tickets. Open / unblocked first wins.

**Next (types):** [codegen-input-types-plan.md](./codegen-input-types-plan.md) — Input types from `content.config` for full `defineCms` `ui` safety (`cms sync` + Vite emit).

## Out of scope here

- Superseding ADR-0019 on `main` / map #1
- Non-Astro location API implementation (ticket 10 Answer: host-only join; stub only)
- MD/MDX body serialization, hosted git CMS
