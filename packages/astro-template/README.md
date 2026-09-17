# PROTOTYPE @cms/astro-template

Bun **self-host** Astro app for the authoring shell (spec P6). Not a shipping product.

## Run

From repo root:

```bash
bun install
bun run dev
```

Happy path: `http://127.0.0.1:4321/cms` (shell) and `/_cms` (JSON API via `src/middleware.ts` — Astro ignores `_`-prefixed pages).

Collections come from a live Vite import of `src/content.config.ts` (P2 discovery) — sample YAML under `content-sandbox/` (`posts`, `authors`).

Portable package smoke (from root): `bun run check && bun run check:allowlist && bun run lint`.

## Tracer endpoints

| Path | Purpose |
|------|---------|
| `/` | Shell home |
| `/cms` | Shell loop UI (`createFetchClient` + discovered schemas / uiSchema) |
| `/_cms/ok` | Pass 0 heartbeat (via `createCmsIntegration`) |
| `/_cms/api/collections` | List discovered collections (`authors`, `posts`) |
| `/_cms/api/collections/posts` | FS-scan entries under `content-sandbox/posts` |
| `/_cms/api/collections/authors` | FS-scan entries under `content-sandbox/authors` |
| `/_cms/api/collections/posts/hello` | Get YAML entry (includes `author` string id) |
| `PUT /_cms/api/collections/posts/new-post` | Upsert (allowlisted) |
| `DELETE /_cms/api/collections/posts/new-post` | Delete (204) |
| `PUT` invalid posts body | Zod fail → 400 |
| `/form-spike` | Zod → JSON Schema → `@cms/form` sjsf (`client:only`) |

`src/middleware.ts` mounts `/_cms` via `createCmsIntegration({ writeMode, isDev, mount })` from `@cms/routes`.

## Allowlist check

```bash
bun run check:allowlist
```

Writes only under `content-sandbox/` prefixes in `allowPaths`. Allowlist deny (mapped path outside roots) is covered by the write-back contract harness, not the template host.

## Track D curl smoke (with `bun run dev` running)

On-disk entries under `content-sandbox/` are **YAML** (`.yaml`; `.yml` accepted on read). Paths resolve from loader/`config({ base })` discovery.

```bash
# round-trip upsert → posts/new-post.yaml
curl -sS -X PUT \
  http://127.0.0.1:4321/_cms/api/collections/posts/new-post \
  -H 'content-type: application/json' \
  -d '{"id":"new-post","collection":"posts","data":{"title":"Fresh","draft":false,"body":"yaml v1","summary":{"en":"Fresh"},"author":"ada"}}'

# 400 — Zod validation failure
curl -sS -o /tmp/cms-400.json -w "%{http_code}\n" -X PUT \
  http://127.0.0.1:4321/_cms/api/collections/posts/new-post \
  -H 'content-type: application/json' \
  -d '{"id":"new-post","collection":"posts","data":{"title":1}}'

# 204 — delete allowlisted entry (re-PUT first if missing)
curl -sS -o /tmp/cms-del.json -w "%{http_code}\n" -X DELETE \
  http://127.0.0.1:4321/_cms/api/collections/posts/new-post
```
