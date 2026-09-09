# Astro Dev CMS (prototype scaffold)

**PROTOTYPE / SPIKE** — throwaway-friendly tracer bullets for the authoring shell. Not an npm product.

## Package graph

```
@cms/fields → @cms/components → @cms/form → @cms/crud → @cms/routes → @cms/astro-template
```

## Tracer passes

| Pass | Status |
|------|--------|
| 0 Wire | packages + Bun workspace + template mounts `/_cms` |
| 1 Read | fake `listCollections` / `getEntry` JSON |
| 2 Write | `createWriteMode` + allowlisted FS writer |
| 3 Form | Zod → JSON Schema → `@cms/form` sjsf wrap (`/form-spike`) |
| Track B | `/cms` shell list via `createFetchClient` |
| Track C | `createCmsIntegration` / `createCmsMiddleware` from `@cms/routes` |
| Track D | HTTP `DELETE` 204, Zod `PUT` 400, allowlist deny 403 |

## Dogfood

```bash
bun install
bun run check:allowlist
bun run dev
```

Then open `http://127.0.0.1:4321/` (or the port Astro prints).

Lint/format with Biome: `bun run lint` / `bun run format`.

**Astro note:** paths under `src/pages/_…` are ignored by Astro, so `/_cms` is mounted via `src/middleware.ts` (same public URL as locked).
