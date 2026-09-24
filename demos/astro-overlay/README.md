# @cms/astro-demo

**Demo / self-host fixture** at `demos/astro-overlay` for schema-first CMS with optional overlay:
native Astro `content.config` + `defineCms(options)` + `cms.components`.
Not a starter to copy into products.

Proves the custom integration ladder — nested field chrome, catalog editors,
preview URLs — while Astro/Zod Input remains validation authority.
`cms sync` emits Input types (`CmsImage` / `CmsReference`) for typed `ui`.

Companion: [`@cms/astro-demo-simple`](../astro-simple) (same schemas, no
overlay).

## Run

From repo root:

```bash
bun install
bun run --filter @cms/astro-demo dev
```

Happy path: `http://127.0.0.1:4322/cms` (shell via `injectRoute`) and `/cms/api`
(JSON API via injected catch-all route). Port **4322** so it can run beside
simple demo on 4321.

`astro.config.mjs` uses `cms()` plus a monorepo-only Vite tweak so workspace
`@cms/*` TypeScript source loads (not part of the published `@cms/astro` API).

Layout:

- `src/content.config.ts` — hand-authored Astro collections (schemas from
  `@cms/astro-demo-simple/schemas`)
- `src/cms.config.ts` — `export default defineCms({ authors, posts })`
- `src/cms.components.ts` — live Svelte catalog (`AuthorNameEditor`)
- `src/cms.types.d.ts` — generated Input types (`cms sync` / gitignored)
- `src/content/` — JSON entries (seeded from simple; optional `seo` on posts)

Checks (from root): `bun run check && bun run check:allowlist && bun run lint`.

## Overlay features

| Feature | Where |
|---------|--------|
| Multi-collection options | `authors` + `posts` keys in `defineCms` options |
| Form tree tabs + nested scope | `posts.form` → content/media tabs; `seo.fields(…)` |
| Custom editor | `authors.form` → `.editor("AuthorNameEditor")` via catalog |
| Preview URL | `posts.previewUrl(id)` → `/posts/:id` |
| Image/ref kinds | codegen `CmsImage` / `CmsReference`; `.kind("image" \| "reference")` |
| Collection type | `type?: "collection" \| "singleton"` (stored; shell wiring later) |

## Useful endpoints

| Path | Purpose |
|------|---------|
| `/` | Demo home |
| `/cms` | Authoring shell (overlay labels + custom editors) |
| `/cms/api/ok` | API heartbeat (via `cms()`) |
| `/cms/api/collections` | List collections (`authors`, `posts`) |
| `/cms/api/collections/authors/ada` | Author entry (custom name editor in shell) |
| `/cms/api/collections/posts/hello` | Post entry (SEO nested chrome in shell) |
| `PUT` invalid posts body | Authoritative schema Input validate → 400 |

## Curl smoke (with `dev` running)

```bash
# overlay still validates via Astro/Zod Input
curl -sS -o /tmp/cms-400.json -w "%{http_code}\n" -X PUT \
  http://127.0.0.1:4322/cms/api/collections/posts/smoke-temp \
  -H 'content-type: application/json' \
  -d '{"id":"smoke-temp","collection":"posts","data":{"title":1}}'
```
