# @cms/astro-template

Reference Astro host for **self-host validation** of the authoring shell. Sample
consumer of `@cms/routes` — not the product identity.

## Run

From repo root:

```bash
bun install
bun run dev
```

Happy path: `http://127.0.0.1:4321/cms` (shell via `injectRoute`) and `/_cms`
(JSON API via `hostModule` middleware — Astro ignores `_`-prefixed pages).

Collections come from a live Vite import of `src/content.config.ts` — sample YAML under `content-sandbox/` (`posts`, `authors`).

Checks (from root): `bun run check && bun run check:allowlist && bun run lint`.

## Useful endpoints

| Path | Purpose |
|------|---------|
| `/` | Reference host home |
| `/cms` | Authoring shell (`createFetchClient` + host-compiled editor config) |
| `/_cms/ok` | API heartbeat (via `createCmsIntegration`) |
| `/_cms/api/collections` | List discovered collections (`authors`, `posts`) |
| `/_cms/api/collections/posts` | FS-scan entries under `content-sandbox/posts` |
| `/_cms/api/collections/authors` | FS-scan entries under `content-sandbox/authors` |
| `/_cms/api/collections/posts/hello` | Get YAML entry (includes `author` string id) |
| `PUT /_cms/api/collections/posts/new-post` | Upsert (allowlisted) |
| `DELETE /_cms/api/collections/posts/new-post` | Delete (204) |
| `PUT` invalid posts body | Zod fail → 400 |
| `/form-spike` | Example: Zod → JSON Schema → `@cms/form` (`client:only`) |

`astro.config.mjs` mounts both surfaces via
`createCmsIntegration({ editorConfig, hostModule })` from `@cms/routes`
(default shell at `/cms`, API at `/_cms`). The host factory lives in
`src/cms/host.ts` (`createHost`).

## Allowlist check

```bash
bun run check:allowlist
```

Writes only under `content-sandbox/` prefixes in `allowPaths`. Allowlist deny (mapped path outside roots) is covered by the write-back contract tests, not the template host.

## Curl smoke (with `bun run dev` running)

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
