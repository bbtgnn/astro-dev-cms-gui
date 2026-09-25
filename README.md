# Dev CMS

A **local CMS** that mounts an **authoring shell** in your app over file-backed
content collections — Astro first, portable beyond it. No always-on CMS server,
no hosted admin cloud.

**Primary usage:** a **dev-mode route** inside the host app. The authoring UI
stays behind a serializable CMS protocol; filesystem write-back is the first
adapter. Astro is the first host (`@cms/astro`); non-Astro hosts use portable
`defineCms` on `@cms/core` (see `demos/sveltekit`).

## The idea

Most “CMS for a static/git site” tools pull you into one of two traps:

- **Hosted git CMS** (Decap/Pages-style) — editors talk to GitHub through someone else’s backend and auth.
- **Heavy admin frameworks** (Payload-style) — powerful, but you’re running a CMS server and a different data model than your site’s content layer.

We want the useful middle:

1. **Your repo is the source of truth.** Content lives in the working tree (JSON today; markdown collections later). Write-back is allowlisted filesystem ops during authoring.
2. **Schema-first collections.** On Astro, author `src/content.config.ts`; optional `defineAstroCms` overlay for form trees / editors. No generated `content.config`. Image / reference / loader metadata come from content-proxy stamps.
3. **Thin host mount.** Astro: `cms()` from `@cms/astro` → shell `/cms`, API `/cms/api`. Elsewhere: `defineCms` + HTTP helpers from `@cms/core`. Dev-only by default.

Borrow the good bits from Kirby / Pages / Payload (field registry, blocks, locale fields, local write-back). Reject their control planes as the default.

## What we are not

- Not a production CMS server or SaaS.
- Not remote git auth, hosted admin, or desktop packaging as the product identity.
- Not “Astro-only” — `@cms/astro` is the Astro host package; `@cms/core` + `@cms/authoring` are host-agnostic.

## Reference hosts (happy path)

```bash
bun install
bun run dev
```

- Astro simple: `http://127.0.0.1:4321/` (`demos/astro-simple` / `@cms/astro-demo-simple`)
- Astro overlay: `bun run dev:overlay` → `http://127.0.0.1:4322/` (`demos/astro-overlay` / `@cms/astro-demo`)
- SvelteKit: `bun run dev:kit` → `http://127.0.0.1:4323/` (`demos/sveltekit` / `@cms/sveltekit-demo`)
- Shell UI: `/cms`
- JSON API: `/cms/api`

## Package graph

```
@cms/authoring  →  @cms/core  ←  @cms/astro  →  demos/astro-*
                ↘            ↘  demos/sveltekit (no @cms/astro)
```

Three product packages match ADR-0008 layers
([ADR-0018](docs/adr/0018-three-packages-for-adr-0008-layers.md)):

- `@cms/authoring` — shell UI + form shell
- `@cms/core` — CMS protocol, stamps, form trees, portable `defineCms`, FS adapters
- `@cms/astro` — `cms()` host mount + content-proxy + `/cms/api` transport
- `demos/` — sample hosts (`astro-simple`, `astro-overlay`, `sveltekit`)

Checks: `bun run check && bun run check:allowlist && bun run lint`.

## Docs & language

- Domain glossary: [CONTEXT.md](CONTEXT.md)
- Architecture index: [docs/spec.md](docs/spec.md)
- ADRs: [docs/adr/](docs/adr/)
- Agent behavior: [AGENTS.md](AGENTS.md)
- Wayfinder map: [GitHub #1](https://github.com/bbtgnn/dev-cms/issues/1)
