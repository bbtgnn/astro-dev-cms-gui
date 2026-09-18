---
status: accepted
---

# Conceptual layers before package extraction

Describe and migrate by **module responsibility**, not by freezing today's `@cms/*` package graph.

Approximate mapping (names illustrative):

- runtime-neutral model / layout declarations
- CMS protocol + client
- Svelte/SJSF form engine (SJSF stays internal; semantic fields/layouts are the normal API, with an advanced escape hatch)
- reusable authoring application (list/editor shell — not trapped in the dogfood Astro template)
- Astro integration / host mount

Existing packages (`fields`, `components`, `form`, `crud`, `routes`, `astro`,
`astro-template`) already approximate these roles. Prefer logical separation and
a single principal seam (the protocol) first. Prove the seam with the same
behavioral suite against in-memory and filesystem adapters. Extract or rename
packages only after those seams stop thrashing; do not explode the monorepo
preemptively.

`@cms/routes` as “the” consumer install root and the locked
`fields → … → astro-template` graph are **historical prototype guidance**, not
the migration destination. The Astro host integration now lives in `@cms/astro`
(`cms` / `createCmsIntegration`); `@cms/routes` keeps the HTTP dispatcher and
fields/protocol barrel.
