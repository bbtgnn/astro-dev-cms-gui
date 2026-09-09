# PROTOTYPE @cms/astro-template

Deno-first dogfood host for tracer bullets. Not a shipping product.

## Run

From repo root:

```bash
deno task install:template
deno task dev
```

`/_cms` is served by `src/middleware.ts` (Astro ignores `_`-prefixed pages).

## Tracer endpoints

| Path | Purpose |
|------|---------|
| `/` | Shell home |
| `/_cms/ok` | Pass 0 heartbeat |
| `/_cms/api/collections` | Pass 1 list |
| `/_cms/api/collections/posts` | Pass 1 entries |
| `/_cms/api/collections/posts/hello` | Pass 1 get |
| `PUT /_cms/api/collections/posts/new-post` | Pass 2 upsert (allowlisted) |
| `/form-spike` | Pass 3 Zod → JSON Schema → form stub |

## Allowlist check

```bash
deno task check:allowlist
```

Writes only under `content-sandbox/` prefixes in `allowPaths`.
