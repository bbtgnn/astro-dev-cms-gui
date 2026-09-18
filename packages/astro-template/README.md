# @cms/astro-template

Reference Astro host for **self-host validation** of the authoring shell. Sample
consumer of `@cms/astro` — not the product identity.

## Run

From repo root:

```bash
bun install
bun run dev
```

Happy path: `http://127.0.0.1:4321/cms` (shell via `injectRoute`) and `/_cms`
(JSON API via default host middleware — Astro ignores `_`-prefixed pages).

`astro.config.mjs` is just `cms()`. Conventions (ADR-0016):

- `src/cms.config.ts` — browser editor projection
- `src/content.config.ts` — Astro + server discovery
- `src/content/` — YAML entries (`posts`, `authors`)

Checks (from root): `bun run check && bun run check:allowlist && bun run lint`.

## Useful endpoints

| Path | Purpose |
|------|---------|
| `/` | Reference host home |
| `/cms` | Authoring shell (`createFetchClient` + host-compiled editor config) |
| `/_cms/ok` | API heartbeat (via `createCmsIntegration`) |
| `/_cms/api/collections` | List discovered collections (`authors`, `posts`) |
| `/_cms/api/collections/posts` | FS-scan entries under `src/content/posts` |
| `/_cms/api/collections/authors` | FS-scan entries under `src/content/authors` |
| `/_cms/api/collections/posts/hello` | Get YAML entry (includes `author` string id) |
| `PUT /_cms/api/collections/posts/new-post` | Upsert (allowlisted) |
| `DELETE /_cms/api/collections/posts/new-post` | Delete (204) |
| `PUT` invalid posts body | Zod fail → 400 |
| `/form-spike` | Example: Zod → JSON Schema → `@cms/form` (`client:only`) |

## Allowlist check

```bash
bun run check:allowlist
```

Default host allowlists discovered collection bases under `src/content/`.
Allowlist deny is covered by the write-back contract tests, not the template host.

## Curl smoke (with `bun run dev` running)

On-disk entries under `src/content/` are **YAML** (`.yaml`; `.yml` accepted on read).

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
