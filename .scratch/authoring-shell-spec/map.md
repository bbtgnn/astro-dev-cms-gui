# Authoring shell buildable spec

Label: `wayfinder:map`

## Destination

A **buildable product/spec** for a **self-host-validated authoring shell**: Astro host + Svelte **shell UI**, monorepo packages (`@cms/fields`, `@cms/components`, `@cms/form`, `@cms/crud`, `@cms/routes`, `@cms/astro-template`), **field schemas** drive generated editors, **write-back** to content files, installable from GitHub (usable, not a polished registry product). Validate first-party via `@cms/astro-template` on **Bun**. Spec covers both markdown-ish and data **collections**. No always-on CMS server.

## Notes

- Domain: Astro content collections; server-light authoring; Kirby/PagesCMS/Payload as reference points only.
- Skills every session should consult: `grilling`, `domain-modeling`; `research` / `prototype` when ticket type says so.
- Tracker: local markdown under `.scratch/authoring-shell-spec/`.
- **Execution override**: buildable [spec.md](spec.md) exists. **P0–P6 landed** on main; open threads in progress.
- **Package map (locked):** `fields → components → form → crud → routes → astro-template`. See [Monorepo package boundaries for @cms/*](issues/04-monorepo-package-boundaries.md).
- **Write-back (locked):** `/_cms/[...path]` dispatcher; `{ id, collection, data }` payloads; `createWriteMode({ root, allowPaths, writer })` with FS writers in v1; dev-only by default. See [Write-back contract (files-only v1)](issues/05-write-back-contract.md).
- **Post-spec frontier (ordered):**
  1. ~~Multi-markdown~~ / ~~glob paths~~ (10–11 resolved; YAML v1)
  2. ~~Implement [spec.md](spec.md) P0–P6~~ — self-host proof: `bun run dev` on `@cms/astro-template`; portable smoke `bun run check` + `check:allowlist` + `lint`
  3. ~~Open thread — `i18n` field~~ — [i18n field](issues/12-i18n-field.md): field-local `{ [default]: T } & Partial<others>`; `resolveLocale`; locale switcher UI (`I18nField` in `@cms/form`)
  4. ~~Open thread — `blocksLayout` field~~ — [blocksLayout field](issues/13-blocks-layout-field.md): `{ type, content }[]`; builder `blocks` map + render `component`; `resolveBlock`
  5. ~~Open thread — rich `image` field~~ — [rich image field](issues/14-rich-image-field.md): path + sharp convert/sizes API; host `CmsImage`
  6. Open thread — end-user form UI composition
  7. Open thread — shell commands / non-FS writers
  8. Open thread — schema builder UI
  - Deferred fog: MD/MDX file serialization; pathTemplate micro-syntax; Decap collection locale layouts / Kirby `translate: false`
- Refer to tickets and this map **by title**, with links.

## Decisions so far

- [Astro schema load and UI metadata](issues/01-astro-schema-load-and-ui-metadata.md): Dev load is Vite-import of `content.config` + Zod parse/sync; UI meta OK on Zod (`.meta`/registries), not as collection siblings or non-Zod `schema` wrappers — [research](research/01-astro-schema-load-and-ui-metadata.md)
- [Prior art for git-backed schema-driven CMS](issues/02-prior-art-git-schema-cms.md): Borrow local FS write-back + field registry/custom-field packages; reject hosted Git auth CMS and GraphQL-as-requirement for v1 — [research](research/02-prior-art-git-schema-cms.md)
- [Deno as @cms/astro-template runtime](issues/03-deno-astro-template-runtime.md): Deno 2.x can host the template for self-host validation (Astro+Svelte+workspaces+local write-back); prefer Deno for that, Node as portable baseline; grant write perms; not Deploy — [research](research/03-deno-astro-template-runtime.md)
- [Monorepo package boundaries for @cms/*](issues/04-monorepo-package-boundaries.md): Locked `fields→components→form→crud→routes→template`; sjsf wrap; shadcn under components; injectable write mode; Deno-first + per-package package.json; consumer install = `@cms/routes`
- [Write-back contract (files-only v1)](issues/05-write-back-contract.md): `/_cms/[...path]`; `{ id, collection, data }` (multi-markdown in `data`); `createWriteMode({ writer })`; FS writers v1; validate-before-write; path map server-side; dev-only default
- [Buildable spec outline](issues/06-buildable-spec-outline.md): Spec TOC Framing→Loop→Architecture→Content model→Shell surface→Open threads→Phased MVP; implementer-first; inline Answers + provenance; §1.2 self-host validation (not “dogfood”); §2 beats include CRUD + validation failure; §6 seams-only list; §7 stub until 07/08
- [Field schema model](issues/07-field-schema-model.md): Builders return Zod+FieldUi (`.meta`); FieldUi `{ widget, label?, options? }` (no id); end-user `meta({ ui: Component })`; input→sjsf; v1 scalars/object/array/markdown/reference + image stub; open-thread reserved widgets; live Zod needed for discovery
- [Collection and schema discovery](issues/08-collection-discovery.md): Live `content.config` import; root `config()` meta (no cms.config); loader path map + optional pathTemplate; build-time FS collections only; listCollections via routes/write-mode; consumer imports only `@cms/routes`
- [Draft the buildable authoring-shell spec](issues/09-draft-buildable-spec.md): Assembled [spec.md](spec.md) (Framing→…→Phased MVP P0–P6); open threads seams-only
- [Multi-markdown serialization](issues/10-multi-markdown-serialization.md): v1 = YAML file ↔ full `data`; MD/MDX body/frontmatter write-back deferred; markdown widget = YAML strings OK
- [Glob and entry path conventions](issues/11-glob-path-conventions.md): id = relpath sans ext; nested `/`; prefer `.yaml`; glob base introspection + config override; list = Content Layer || FS scan; yaml+yml collision errors
- [i18n field](issues/12-i18n-field.md): field-local `{ [defaultLocale]: T } & Partial<others>`; builder `i18n(inner, { locales, defaultLocale, fallbacks? })`; `resolveLocale`; persist raw map; locale switcher UI (one active locale)
- [blocksLayout field](issues/13-blocks-layout-field.md): `{ type, content }[]`; builder `blocks` map with `schema` + render `component`; `resolveBlock`; min list+form UI (no Editor.js runtime)
- [Rich image field](issues/14-rich-image-field.md): path string + sharp convert/sizes on `/_cms`; folder beside entry; host `CmsImage` srcset wrapper; research [14-image-resize-modules](research/14-image-resize-modules.md)

## Not yet specified

- **Next: implement rich `image`** (Answer locked — [14](issues/14-rich-image-field.md); research [14-image-resize-modules](research/14-image-resize-modules.md)).
- **Deferred — MD/MDX file serialization**: frontmatter + body / `contentField` / multi-segment — after P0–P6 (or when markdown collections are in destination).
- Exact `pathTemplate` micro-syntax (minimal `{base}/{id}.{ext}` OK at implement time).
- Exact GitHub URL / path-install syntax for `@cms/*` (boundary locked: install root = `@cms/routes`).
- **Deferred — Decap collection locale layouts / Kirby `translate: false`** (not in field-local i18n slice).
- ~~**Open thread — `blocksLayout`**~~ — resolved: see [blocksLayout field](issues/13-blocks-layout-field.md).
- ~~**Open thread — rich `image`**~~ — Answer locked: see [rich image field](issues/14-rich-image-field.md); research [14-image-resize-modules](research/14-image-resize-modules.md).
- **Open thread — end-user form UI composition** (after rich `image` implement).
- **Open thread — shell commands / non-FS writers** (after form composition).
- **Open thread — schema builder UI** (last).
- **Collection vs singleton/file** — `kind: 'singleton'` reserved; not in v1.
- Root `.meta(config(...))` replaces `defineCollection({ ui })` (locked in discovery).

Destination artifact: [spec.md](spec.md) (ticket 09 resolved).

## Out of scope

- Offline / PWA / Deno-desktop / isomorphic-git sync authoring (Deno as a *template runtime* is in-scope; sync products are not).
- **Deno Deploy (or other read-only edge hosts) as the write-back target** — local FS only for authoring writes in v1.
- Non-developer editor UX, auth, and hosted preview.
- Polished npm-registry marketplace packaging (GitHub-installable is the bar).
- Hosted GitHub App/OAuth as the **default v1 write path** (writer seam may allow a GitHub writer later as an open thread).
