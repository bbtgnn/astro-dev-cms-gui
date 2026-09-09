# Authoring shell buildable spec

Label: `wayfinder:map`

## Destination

A **buildable product/spec** for a **self-host-validated authoring shell**: Astro host + Svelte **shell UI**, monorepo packages (`@cms/fields`, `@cms/components`, `@cms/form`, `@cms/crud`, `@cms/routes`, `@cms/astro-template`), **field schemas** drive generated editors, **write-back** to content files, installable from GitHub (usable, not a polished registry product). Validate first-party via `@cms/astro-template`, preferably on Deno. Spec covers both markdown-ish and data **collections**. No always-on CMS server.

## Notes

- Domain: Astro content collections; server-light authoring; Kirby/PagesCMS/Payload as reference points only.
- Skills every session should consult: `grilling`, `domain-modeling`; `research` / `prototype` when ticket type says so.
- Tracker: local markdown under `.scratch/authoring-shell-spec/`.
- **Execution override**: writing the buildable spec *is* the destination; assemble it only after the decision tickets that feed it are resolved.
- **Package map (locked):** `fields → components → form → crud → routes → astro-template`. See [Monorepo package boundaries for @cms/*](issues/04-monorepo-package-boundaries.md).
- **Write-back (locked):** `/_cms/[...path]` dispatcher; `{ id, collection, data }` payloads; `createWriteMode({ root, allowPaths, writer })` with FS writers in v1; dev-only by default. See [Write-back contract (files-only v1)](issues/05-write-back-contract.md).
- Open threads (not on the closed route): custom fields (`i18n`, `image`, `blocksLayout`); shell commands / non-FS **writers**; end-user form UI composition; **schema builder UI**.
- Refer to tickets and this map **by title**, with links.

## Decisions so far

- [Astro schema load and UI metadata](issues/01-astro-schema-load-and-ui-metadata.md): Dev load is Vite-import of `content.config` + Zod parse/sync; UI meta OK on Zod (`.meta`/registries), not as collection siblings or non-Zod `schema` wrappers — [research](research/01-astro-schema-load-and-ui-metadata.md)
- [Prior art for git-backed schema-driven CMS](issues/02-prior-art-git-schema-cms.md): Borrow local FS write-back + field registry/custom-field packages; reject hosted Git auth CMS and GraphQL-as-requirement for v1 — [research](research/02-prior-art-git-schema-cms.md)
- [Deno as @cms/astro-template runtime](issues/03-deno-astro-template-runtime.md): Deno 2.x can host the template for self-host validation (Astro+Svelte+workspaces+local write-back); prefer Deno for that, Node as portable baseline; grant write perms; not Deploy — [research](research/03-deno-astro-template-runtime.md)
- [Monorepo package boundaries for @cms/*](issues/04-monorepo-package-boundaries.md): Locked `fields→components→form→crud→routes→template`; sjsf wrap; shadcn under components; injectable write mode; Deno-first + per-package package.json; consumer install = `@cms/routes`
- [Write-back contract (files-only v1)](issues/05-write-back-contract.md): `/_cms/[...path]`; `{ id, collection, data }` (multi-markdown in `data`); `createWriteMode({ writer })`; FS writers v1; validate-before-write; path map server-side; dev-only default
- [Buildable spec outline](issues/06-buildable-spec-outline.md): Spec TOC Framing→Loop→Architecture→Content model→Shell surface→Open threads→Phased MVP; implementer-first; inline Answers + provenance; §1.2 self-host validation (not “dogfood”); §2 beats include CRUD + validation failure; §6 seams-only list; §7 stub until 07/08

## Not yet specified

- **Open thread — shell commands / non-FS writers**: `runCommand`, `githubRepoWriter()`, etc. on the writer/write-mode seam; v1 ships FS writers only.
- **Open thread — `i18n` field**: `z.custom.i18n`-style wrapper; locale alternatives (Kirby-like); deep UI/behavior unspecified.
- **Open thread — `image` field**: wasm webp + srcsets for Astro; deep UI/behavior unspecified.
- **Open thread — `blocksLayout` field**: block-based body (Kirby-like) + available-blocks list; later addition, deep contract unspecified.
- **Open thread — end-user form UI composition**: override/replace form widgets and chrome without forking `@cms/form`; exact slots API beyond sjsf theme/`ui:components` + FieldUi.
- **Open thread — schema builder UI**: field schemas (and/or collection defs) can also be authored via the shell UI, not only in code; deep product/UX unspecified—v1 remains code-defined schemas driving forms.
- Cheap **prototype** of a generated form from mock field schemas — graduate if field-schema grilling needs a concrete artifact to react to.
- Exact GitHub URL / path-install syntax for `@cms/*` (boundary locked: install root = `@cms/routes`).
- Implementation phasing (markdown vs data collections first) once the buildable spec exists.
- **Multi-markdown serialization**: how multiple markdown fields in `data` map into one on-disk file (frontmatter + segments)—fold into field-schema / discovery.
- **Collection vs singleton/file** modeling—fold into collection discovery when that ticket runs.
- **Astro helpers as widgets**: `reference()` and `image()` need shell conventions—fold into field-schema model.
- **Edit the Zod input shape** (already required on write); transforms/coerce edge cases—fold into field-schema.
- **No `defineCollection({ ui })` extension**: Astro’s content-config parser strips unknown siblings—discovery must not rely on them.
- **`(collection, id)` → path** mapping rules using loader roots—fold into collection discovery.

## Out of scope

- Offline / PWA / Deno-desktop / isomorphic-git sync authoring (Deno as a *template runtime* is in-scope; sync products are not).
- **Deno Deploy (or other read-only edge hosts) as the write-back target** — local FS only for authoring writes in v1.
- Non-developer editor UX, auth, and hosted preview.
- Polished npm-registry marketplace packaging (GitHub-installable is the bar).
- Hosted GitHub App/OAuth as the **default v1 write path** (writer seam may allow a GitHub writer later as an open thread).
