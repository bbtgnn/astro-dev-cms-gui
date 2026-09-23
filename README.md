# Astro Dev CMS

A **server-light authoring shell** for Astro content collections — edit content as files in a real project, with a Svelte UI generated from your CMS semantic schema. No always-on CMS server, no hosted admin cloud.

**Primary usage:** mount the shell as a **dev-mode route** inside an Astro project. The authoring UI is kept as general as possible behind a serializable CMS protocol; Astro + filesystem write-back is the first host path.

## The idea

Most “CMS for a static/git site” tools pull you into one of two traps:

- **Hosted git CMS** (Decap/Pages-style) — editors talk to GitHub through someone else’s backend and auth.
- **Heavy admin frameworks** (Payload-style) — powerful, but you’re running a CMS server and a different data model than Astro’s content layer.

We want the useful middle:

1. **Your Astro repo is the source of truth.** Content lives in the working tree (JSON today; markdown collections later). Write-back is allowlisted filesystem ops during authoring.
2. **One CMS schema drives the UI and Astro.** Author `src/cms.config.ts`; Astro `content.config.ts` is generated. Editors don’t maintain a parallel `config.yml`.
3. **Dev integration is thin.** `cms()` from `@cms/astro` mounts the shell at `/cms` and the protocol at `/_cms`. Conventions: `src/cms.config.ts`, `src/content.config.ts`, content under `src/content/`. Dev-only by default.

Borrow the good bits from Kirby / Pages / Payload (field registry, blocks, locale fields, local write-back). Reject their control planes as the default.

## What we are not

- Not a production CMS server or SaaS.
- Not remote git auth, hosted admin, or any desktop packaging story — this monorepo is **`@cms/*` + Astro only**.

## Reference host (happy path)

```bash
bun install
bun run dev
```

- Site: `http://127.0.0.1:4321/` (`demos/astro-simple` / `@cms/astro-demo-simple`, default)
- Overlay demo: `bun run dev:overlay` → `http://127.0.0.1:4322/` (`demos/astro-overlay` / `@cms/astro-demo`)
- Shell UI: `/cms`
- JSON API: `/_cms` (via middleware — Astro ignores `src/pages/_…`)

`demos/astro-simple` and `demos/astro-overlay` are the in-repo Astro consumers used for self-host validation.

## Package graph

```
@cms/authoring  →  @cms/core  ←  @cms/astro  →  demos/astro-simple (@cms/astro-demo-simple)
                                           ↘  demos/astro-overlay (@cms/astro-demo)
```

Three product packages match ADR-0008 layers
([ADR-0018](docs/adr/0018-three-packages-for-adr-0008-layers.md)):

- `@cms/authoring` — shell UI + form shell
- `@cms/core` — semantic IR + CMS protocol + FS adapters
- `@cms/astro` — `cms()` host mount + `/_cms` transport
- `demos/` — sample hosts (`astro-simple`, `astro-overlay`)

Checks: `bun run check && bun run check:allowlist && bun run lint`.

## Docs & language

- Domain glossary: [CONTEXT.md](CONTEXT.md)
- Architecture index: [docs/spec.md](docs/spec.md)
- ADRs: [docs/adr/](docs/adr/)
- Wayfinder map: [GitHub #1](https://github.com/bbtgnn/astro-dev-cms-gui/issues/1)
