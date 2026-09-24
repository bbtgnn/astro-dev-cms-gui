# @cms/sveltekit-demo

**Demo / self-host fixture** at `demos/sveltekit` for non-Astro CMS:
portable `defineCms` + form tree + `createCmsHost` / `nodeFsWriter`.
Not a starter to copy into products. **No Astro** — does not use
`@cms/astro`, content-proxy, or `cms()`.

Proves the SvelteKit self-host ladder: schema + location + form tree in one
module, catalog map for a custom editor, `/cms` authoring shell, `/cms/api`
protocol transport writing JSON under `./data`.

## Run

From repo root:

```bash
bun install
bun run --filter @cms/sveltekit-demo dev
# or: bun run dev:kit
```

Happy path: `http://127.0.0.1:4323/cms` and `/cms/api` (JSON API via
`src/routes/cms/api/[...path]/+server.ts`). Port **4323** so it can run
beside Astro demos.

## Layout

- `src/lib/cms.ts` — `defineCms((cms) => …)` with authors + posts (tabs,
  columns, stamped image + reference, catalog editor key)
- `src/lib/cms-components.ts` — live Svelte catalog (`AuthorNameEditor`)
- `src/lib/cms-host.server.ts` — `hostFromDefineCms` over `./data`
- `src/routes/cms/api/[...path]/+server.ts` — protocol ↔ HTTP via
  `@cms/core/http` `createCmsDispatcher`
- `src/routes/cms/+page.svelte` — `AuthoringApp` (`ssr = false`)
- `data/` — seed JSON entries (`authors/ada.json`, `posts/hello.json`)

## Checks

```bash
bun run --filter @cms/sveltekit-demo check
bun run --filter @cms/sveltekit-demo build
```

Root `bun run check` does not include this package (SvelteKit sync is heavier);
use the filter scripts above.

## Useful endpoints

| Path | Purpose |
|------|---------|
| `/` | Demo home |
| `/cms` | Authoring shell |
| `/cms/api/ok` | API heartbeat |
| `/cms/api/collections` | List collections |
| `/cms/api/collections/posts/hello` | Get JSON entry |
