# Astro Dev CMS (prototype scaffold)

**PROTOTYPE / SPIKE** — throwaway-friendly tracer bullets for the authoring shell. Not an npm product.

## Package graph

```
@cms/fields → @cms/components → @cms/form → @cms/crud → @cms/routes → @cms/astro-template
```

## Tracer passes

| Pass | Status |
|------|--------|
| 0 Wire | packages + Deno workspace + template mounts `/_cms` |
| 1 Read | fake `listCollections` / `getEntry` JSON |
| 2 Write | `createWriteMode` + allowlisted FS writer |
| 3 Form | optional Zod → JSON Schema → form page |

## Dogfood

```bash
deno task install:template
deno task check:allowlist
deno task dev
```

Then open `http://127.0.0.1:4321/` (or the port Astro prints).

**Astro note:** paths under `src/pages/_…` are ignored by Astro, so `/_cms` is mounted via `src/middleware.ts` (same public URL as locked).
