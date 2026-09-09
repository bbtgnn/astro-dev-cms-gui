# Astro schema load and UI metadata

Type: research
Status: resolved

## Question

Against Astro’s current Content Layer / content collections APIs (primary docs and source): how are collection definitions and Zod (or other) schemas loaded at **dev time**? Can a **field schema** carry UI metadata beside validation without breaking Astro’s loaders? What are viable patterns for dynamically importing those defs to generate an **authoring shell** UI (in-place enrichment vs parallel map vs overlay)? Cite constraints that will force the field-schema and discovery grilling tickets.

## Answer

Astro Vite-imports `src/content.config.*`, parses `{ collections }` onto a digest-watched observer, and validates entries with Zod `safeParseAsync`. UI metadata can ride on Zod (`.meta()` / registries) without breaking loaders; collection-config siblings and non-Zod wrappers will not. Shell options: in-place Zod meta, parallel map, or JSON Schema overlay—see constraints for tickets 07/08.

Findings: [research/01-astro-schema-load-and-ui-metadata.md](../research/01-astro-schema-load-and-ui-metadata.md)

## Comments

- Research completed against Astro primary docs + `withastro/astro` content-layer source; write-up in `research/01-astro-schema-load-and-ui-metadata.md`.
- 2026-09-09: Late research agent superseded an earlier in-session draft with a source-deeper write-up; verdict unchanged (Zod-only `schema`; UI via meta/registries or parallel map; no collection-config siblings).
