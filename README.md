# Astro Dev CMS

A **server-light authoring shell** for Astro content collections — edit content as files in a real project, with a Svelte UI generated from your Zod field schemas. No always-on CMS server, no hosted admin cloud.

**Primary usage:** mount the shell as a **dev-mode route** inside an Astro project. The authoring UI is kept as general as possible behind a serializable CMS protocol; Astro + filesystem write-back is the first host path.

## The idea

Most “CMS for a static/git site” tools pull you into one of two traps:

- **Hosted git CMS** (Decap/Pages-style) — editors talk to GitHub through someone else’s backend and auth.
- **Heavy admin frameworks** (Payload-style) — powerful, but you’re running a CMS server and a different data model than Astro’s content layer.

We want the useful middle:

1. **Your Astro repo is the source of truth.** Content lives in the working tree (JSON today; markdown collections later). Write-back is allowlisted filesystem ops during authoring.
2. **Schemas you already write drive the UI.** Collection Zod (+ FieldUi on `.meta()`) becomes the form. Editors don’t maintain a parallel `config.yml`.
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

- Site: `http://127.0.0.1:4321/`
- Shell UI: `/cms`
- JSON API: `/_cms` (via middleware — Astro ignores `src/pages/_…`)

`@cms/astro-template` is the in-repo reference Astro consumer used for self-host validation.

## Package graph

```
@cms/fields → @cms/components → @cms/form → @cms/crud → @cms/routes
                                                      ↘
                                         @cms/astro → @cms/astro-template
```

`@cms/astro` is the consumer install surface (`cms()`). `@cms/routes` is the
HTTP dispatcher + fields/protocol barrel. The graph approximates the current
layout, not a locked extraction target — see
[ADR-0009](docs/adr/0009-conceptual-layers-before-package-extraction.md) and
[ADR-0016](docs/adr/0016-astro-convention-install-surface.md).

Checks: `bun run check && bun run check:allowlist && bun run lint`.

## Docs & language

- Domain glossary: [CONTEXT.md](CONTEXT.md)
- Architecture index: [docs/spec.md](docs/spec.md)
- ADRs: [docs/adr/](docs/adr/)
- Wayfinder map: [GitHub #1](https://github.com/bbtgnn/astro-dev-cms-gui/issues/1)
