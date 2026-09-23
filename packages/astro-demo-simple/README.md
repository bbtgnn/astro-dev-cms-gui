# @cms/astro-demo-simple

**Demo / self-host fixture** for schema-first CMS: native Astro `content.config`
only, zero-arg `cms()` in `astro.config`. Not a starter to copy into products.

Proves the simple integration ladder — stock editors from stamped schemas, no
`cms.config` / `cms.components` overlay.

## Run

From repo root:

```bash
bun install
bun run --filter @cms/astro-demo-simple dev
```

Happy path: `http://127.0.0.1:4321/cms` (shell via `injectRoute`) and `/_cms`
(JSON API via default host middleware).

`astro.config.mjs` uses `cms()` plus a monorepo-only Vite tweak so workspace
`@cms/*` TypeScript source loads (not part of the published `@cms/astro` API).

Layout:

- `src/content.config.ts` — hand-authored Astro collections (`authors`, `posts`)
- `src/content/` — JSON entries (`posts`, `authors`)
- **No** `src/cms.config.ts` / `cms.components.ts`

Checks (from root): `bun run check && bun run check:allowlist && bun run lint`.

## Useful endpoints

| Path | Purpose |
|------|---------|
| `/` | Demo home |
| `/cms` | Authoring shell (stock editors from content.config stamps) |
| `/_cms/ok` | API heartbeat (via `cms()`) |
| `/_cms/api/collections` | List collections (`authors`, `posts`) |
| `/_cms/api/collections/posts` | FS-scan entries under `src/content/posts` |
| `/_cms/api/collections/authors` | FS-scan entries under `src/content/authors` |
| `/_cms/api/collections/posts/hello` | Get JSON entry (includes `author` string id) |
| `PUT /_cms/api/collections/posts/new-post` | Upsert (allowlisted) |
| `DELETE /_cms/api/collections/posts/new-post` | Delete (204) |
| `PUT` invalid posts body | Authoritative schema Input validate → 400 |

## Curl smoke (with `dev` running)

On-disk entries under `src/content/` are **JSON** (`.json`).

```bash
# create (expectedRevision null / omitted) — new id only
curl -sS -X PUT \
  http://127.0.0.1:4321/_cms/api/collections/posts/smoke-temp \
  -H 'content-type: application/json' \
  -d '{"id":"smoke-temp","collection":"posts","data":{"title":"Fresh","draft":false,"body":"json v1","author":"ada"}}'

# update existing — pass expectedRevision from GET
REV=$(curl -sS http://127.0.0.1:4321/_cms/api/collections/posts/hello | bun -e 'console.log(JSON.parse(await Bun.stdin.text()).revision)')
curl -sS -X PUT \
  http://127.0.0.1:4321/_cms/api/collections/posts/hello \
  -H 'content-type: application/json' \
  -d "{\"id\":\"hello\",\"collection\":\"posts\",\"expectedRevision\":\"$REV\",\"data\":{\"title\":\"Hello\",\"draft\":true,\"body\":\"updated\",\"cover\":\"./hello/cover/pixel.png\",\"author\":\"ada\"}}"

# 400 — authoritative validation failure
curl -sS -o /tmp/cms-400.json -w "%{http_code}\n" -X PUT \
  http://127.0.0.1:4321/_cms/api/collections/posts/smoke-temp \
  -H 'content-type: application/json' \
  -d '{"id":"smoke-temp","collection":"posts","data":{"title":1}}'
```
