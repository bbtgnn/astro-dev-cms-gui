# Astro Dev CMS

A **server-light authoring shell** for Astro content collections — edit content as files in a real project, with a Svelte UI generated from your Zod field schemas. No always-on CMS server, no hosted admin cloud.

This repo is still a **prototype / spike** monorepo, not a polished npm product. The idea below is the destination; the `@cms/*` packages are how we’re proving it.

## The idea

Most “CMS for a static/git site” tools pull you into one of two traps:

- **Hosted git CMS** (Decap/Pages-style) — editors talk to GitHub through someone else’s backend and auth.
- **Heavy admin frameworks** (Payload-style) — powerful, but you’re running a CMS server and a different data model than Astro’s content layer.

We want the useful middle:

1. **Your Astro repo is the source of truth.** Content lives in the working tree (YAML today; markdown collections later). Write-back is allowlisted filesystem ops during authoring.
2. **Schemas you already write drive the UI.** Collection Zod (+ FieldUi on `.meta()`) becomes the form. Editors don’t maintain a parallel `config.yml`.
3. **Dev integration is thin.** Mount one `/_cms` handler from `@cms/routes` into the Astro project; shell UI at `/cms`. Consumer install surface is `@cms/routes`.

Borrow the good bits from Kirby / Pages / Payload (field registry, blocks, locale fields, local write-back). Reject their control planes as the default.

## What we are not

- Not a production CMS server or SaaS.
- Not a desktop clone/run shell (that product lives in a separate repo).

## Self-host the shell (happy path)

```bash
bun install
bun run dev
```

- Site: `http://127.0.0.1:4321/`
- Shell UI: `/cms`
- JSON API: `/_cms` (via middleware — Astro ignores `src/pages/_…`)

## Package graph

```
@cms/fields → @cms/components → @cms/form → @cms/crud → @cms/routes → @cms/astro-template
```

Portable smoke: `bun run check && bun run check:allowlist && bun run lint`.

## Docs & language

- Domain glossary: [CONTEXT.md](CONTEXT.md)
- Spec / map (working notes): `.scratch/authoring-shell-spec/`
