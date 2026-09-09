# Astro Dev CMS (prototype scaffold)

**PROTOTYPE / SPIKE** — self-host-validated authoring shell (spec P0–P6). Not an npm product.

## Package graph

```
@cms/fields → @cms/components → @cms/form → @cms/crud → @cms/routes → @cms/astro-template
```

Consumer install surface is **`@cms/routes`** (re-exports builders, discovery, integration).

## Self-host (happy path)

```bash
bun install
bun run dev
```

Opens `@cms/astro-template` at `http://127.0.0.1:4321/` — shell UI at `/cms`, JSON API at `/_cms`.

## Portable smoke (packages)

```bash
bun run check          # tsc + svelte-check on the package graph
bun run check:allowlist
bun run lint
```

## Tracer passes

| Pass | Status |
|------|--------|
| 0 Wire | packages + Bun workspace + template mounts `/_cms` |
| 1 Read | `listCollections` / `getEntry` via write-mode FS scan |
| 2 Write | `createWriteMode` + allowlisted FS writer |
| 3 Form | Zod → JSON Schema → `@cms/form` sjsf wrap (`/form-spike`) |
| Track B | `/cms` shell list via `createFetchClient` |
| Track C | `createCmsIntegration` / `createCmsMiddleware` from `@cms/routes` |
| Track D | HTTP `DELETE` 204, Zod `PUT` 400, allowlist deny 403 |
| P5 | markdown textarea; `adaptReference` / `adaptImage`; authors + posts |
| P6 | self-host proof (`bun run dev` + portable smoke above) |

**Astro note:** paths under `src/pages/_…` are ignored by Astro, so `/_cms` is mounted via `src/middleware.ts` (same public URL as locked).
