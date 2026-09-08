# Authoring shell buildable spec

Label: `wayfinder:map`

## Destination

A **buildable product/spec** for a dogfoodable **authoring shell**: Astro host + Svelte **shell UI**, monorepo packages (`@cms/fields`, `@cms/components`, `@cms/routes`, `@cms/astro-template`), **field schemas** drive generated editors, **write-back** to content files, installable from GitHub (usable, not a polished registry product). Dogfood via `@cms/astro-template`, preferably on Deno. Spec covers both markdown-ish and data **collections**. No always-on CMS server.

## Notes

- Domain: Astro content collections; server-light authoring; Kirby/PagesCMS/Payload as reference points only.
- Skills every session should consult: `grilling`, `domain-modeling`; `research` / `prototype` when ticket type says so.
- Tracker: local markdown under `.scratch/authoring-shell-spec/`.
- **Execution override**: writing the buildable spec *is* the destination; assemble it only after the decision tickets that feed it are resolved.
- Package sketch (not yet locked): `@cms/fields` (field schema + extensions), `@cms/components` (Svelte editors), `@cms/routes` (Astro routes/endpoints for the shell), `@cms/astro-template` (dogfood/demo host; try Deno).
- Custom fields (`i18n`, `image`+webp/srcset, `blocksLayout`) and shell **commit/command execution** stay **open threads** — named on the map, not closed by this effort’s core route.
- Refer to tickets and this map **by title**, with links.

## Decisions so far

<!-- one line per closed ticket: gist + link; detail lives on the ticket -->

## Not yet specified

- **Open thread — shell commands**: authoring shell may later commit and run other local commands; v1 write-back is files-only.
- **Open thread — `i18n` field**: `z.custom.i18n`-style wrapper; locale alternatives (Kirby-like); deep UI/behavior unspecified.
- **Open thread — `image` field**: wasm webp + srcsets for Astro; deep UI/behavior unspecified.
- **Open thread — `blocksLayout` field**: block-based body (Kirby-like) + available-blocks list; later addition, deep contract unspecified.
- Cheap **prototype** of a generated form from mock field schemas — graduate if field-schema grilling needs a concrete artifact to react to.
- Exact GitHub consume story (single package vs path installs of `@cms/*`) beyond “monorepo + template.”
- Implementation phasing (markdown vs data collections first) once the buildable spec exists.

## Out of scope

- Offline / PWA / Deno-desktop / isomorphic-git sync authoring (Deno as a *template runtime* is in-scope to research; sync products are not).
- Non-developer editor UX, auth, and hosted preview.
- Polished npm-registry marketplace packaging (GitHub-installable is the bar).
