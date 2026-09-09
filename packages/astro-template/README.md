# PROTOTYPE @cms/astro-template

Bun dogfood host for tracer bullets. Not a shipping product.

## Run

From repo root:

```bash
bun install
bun run dev
```

`/_cms` is served by `src/middleware.ts` (Astro ignores `_`-prefixed pages).

## Tracer endpoints

| Path | Purpose |
|------|---------|
| `/` | Shell home |
| `/cms` | Track B shell list UI (`createFetchClient`) |
| `/_cms/ok` | Pass 0 heartbeat (via `createCmsIntegration`) |
| `/_cms/api/collections` | Pass 1 list |
| `/_cms/api/collections/posts` | Pass 1 entries |
| `/_cms/api/collections/posts/hello` | Pass 1 get |
| `PUT /_cms/api/collections/posts/new-post` | Pass 2 upsert (allowlisted) |
| `DELETE /_cms/api/collections/posts/new-post` | Track D delete (204) |
| `PUT` invalid posts body | Track D Zod fail → 400 |
| `PUT /_cms/api/collections/posts/blocked` | Track D allowlist deny → 403 |
| `/form-spike` | Pass 3 / Track A: Zod → JSON Schema → `@cms/form` sjsf (`client:only`) |

`src/middleware.ts` mounts `/_cms` via `createCmsIntegration({ writeMode, isDev, mount })` from `@cms/routes` (Track C).

## Allowlist check

```bash
bun run check:allowlist
```

Writes only under `content-sandbox/` prefixes in `allowPaths`.

## Track D curl smoke (with `bun run dev` running)

```bash
# 400 — Zod validation failure
curl -sS -o /tmp/cms-400.json -w "%{http_code}\n" -X PUT \
  http://127.0.0.1:4321/_cms/api/collections/posts/new-post \
  -H 'content-type: application/json' \
  -d '{"id":"new-post","collection":"posts","data":{"title":1}}'

# 403 — mapped path outside allowlist
curl -sS -o /tmp/cms-403.json -w "%{http_code}\n" -X PUT \
  http://127.0.0.1:4321/_cms/api/collections/posts/blocked \
  -H 'content-type: application/json' \
  -d '{"id":"blocked","collection":"posts","data":{"title":"x","draft":false,"body":"y"}}'

# 204 — delete allowlisted entry (re-PUT first if missing)
curl -sS -o /tmp/cms-del.json -w "%{http_code}\n" -X DELETE \
  http://127.0.0.1:4321/_cms/api/collections/posts/new-post
```
