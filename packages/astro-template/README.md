# PROTOTYPE @cms/astro-template

Bun dogfood host for tracer bullets. Not a shipping product.

## Run

From repo root:

```bash
bun install
bun run dev
```

`/_cms` is served by `src/middleware.ts` (Astro ignores `_`-prefixed pages).

Collections come from a live Vite import of `src/content.config.ts` (P2 discovery) — no `fakeCatalog` on the happy path.

## Tracer endpoints

| Path | Purpose |
|------|---------|
| `/` | Shell home |
| `/cms` | Shell loop UI (`createFetchClient` + discovered schemas) |
| `/_cms/ok` | Pass 0 heartbeat (via `createCmsIntegration`) |
| `/_cms/api/collections` | List discovered collections |
| `/_cms/api/collections/posts` | FS-scan entries under `content-sandbox/posts` |
| `/_cms/api/collections/posts/hello` | Get YAML entry |
| `PUT /_cms/api/collections/posts/new-post` | Upsert (allowlisted) |
| `DELETE /_cms/api/collections/posts/new-post` | Delete (204) |
| `PUT` invalid posts body | Zod fail → 400 |
| `PUT /_cms/api/collections/posts/blocked` | Allowlist deny → 403 |
| `/form-spike` | Zod → JSON Schema → `@cms/form` sjsf (`client:only`) |

`src/middleware.ts` mounts `/_cms` via `createCmsIntegration({ writeMode, isDev, mount })` from `@cms/routes`.

## Allowlist check

```bash
bun run check:allowlist
```

Writes only under `content-sandbox/` prefixes in `allowPaths`.

## Track D curl smoke (with `bun run dev` running)

On-disk entries under `content-sandbox/` are **YAML** (`.yaml`; `.yml` accepted on read). Paths resolve from loader/`config({ base })` discovery.

```bash
# round-trip upsert → posts/new-post.yaml
curl -sS -X PUT \
  http://127.0.0.1:4321/_cms/api/collections/posts/new-post \
  -H 'content-type: application/json' \
  -d '{"id":"new-post","collection":"posts","data":{"title":"Fresh","draft":false,"body":"yaml v1"}}'

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
