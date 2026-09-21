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

`astro.config.mjs` uses `cms()` plus a monorepo-only Vite tweak so workspace
`@cms/*` TypeScript source loads (not part of the published `@cms/astro` API).

Conventions (ADR-0016 / ADR-0019):

- `src/cms.config.ts` — Node-safe unified tree (`defineCms` + catalog string keys);
  also the generation / host-validator partition
- `src/cms.components.ts` — Vite-only live Svelte catalog (`virtual:@cms/components`)
- `src/content.config.ts` — **generated** native Astro output (do not hand-edit)
- `src/content/` — JSON entries (`posts`, `authors`)

Regenerate / CI check (from this package):

```bash
bun ../astro/bin/cms.ts generate --root .
bun ../astro/bin/cms.ts generate --check --root .
```

Checks (from root): `bun run check && bun run check:allowlist && bun run lint`.

## Useful endpoints

| Path | Purpose |
|------|---------|
| `/` | Reference host home |
| `/cms` | Authoring shell (`createFetchClient` + host-compiled editor config) |
| `/_cms/ok` | API heartbeat (via `createCmsIntegration`) |
| `/_cms/api/collections` | List collections (`authors`, `posts`) |
| `/_cms/api/collections/posts` | FS-scan entries under `src/content/posts` |
| `/_cms/api/collections/authors` | FS-scan entries under `src/content/authors` |
| `/_cms/api/collections/posts/hello` | Get JSON entry (includes `author` string id) |
| `PUT /_cms/api/collections/posts/new-post` | Upsert (allowlisted) |
| `DELETE /_cms/api/collections/posts/new-post` | Delete (204) |
| `PUT` invalid posts body | Authoritative IR validator → 400 |

## Allowlist check

From the repo root: `bun run check:allowlist` (core write-back contracts + authoring layer/session tests).

Default host (with `cms.config.ts`) builds an authoritative validator from the
IR partition and injects FS image + reference-existence checks under
`src/content/`.

## Curl smoke (with `bun run dev` running)

On-disk entries under `src/content/` are **JSON** (`.json`).

```bash
# round-trip upsert → posts/new-post.json
curl -sS -X PUT \
  http://127.0.0.1:4321/_cms/api/collections/posts/new-post \
  -H 'content-type: application/json' \
  -d '{"id":"new-post","collection":"posts","data":{"title":"Fresh","draft":false,"body":"json v1","author":"ada"}}'

# 400 — authoritative validation failure
curl -sS -o /tmp/cms-400.json -w "%{http_code}\n" -X PUT \
  http://127.0.0.1:4321/_cms/api/collections/posts/new-post \
  -H 'content-type: application/json' \
  -d '{"id":"new-post","collection":"posts","data":{"title":1}}'

# 204 — delete allowlisted entry (re-PUT first if missing)
curl -sS -o /tmp/cms-del.json -w "%{http_code}\n" -X DELETE \
  http://127.0.0.1:4321/_cms/api/collections/posts/new-post
```
