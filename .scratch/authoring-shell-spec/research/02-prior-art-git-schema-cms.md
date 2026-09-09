# Prior art: git-backed / schema-driven CMS (repo-local focus)

**Ticket:** [Prior art for git-backed schema-driven CMS](../issues/02-prior-art-git-schema-cms.md)  
**Question:** What should a buildable authoring-shell spec borrow or reject from Pages CMS, Keystatic, Decap, Tina, and Kirby—focused on repo-local editing, schema→UI generation, and dev-only / git-backed flows?  
**Product frame:** Astro host + Svelte shell UI; packages `@cms/fields`, `@cms/components`, `@cms/routes`, `@cms/astro-template`; GitHub-installable; files-only write-back v1; offline/PWA/sync and non-dev auth out of scope; custom `i18n` / `image` / `blocksLayout` are open threads only.

## Verdict

Closest models for **this** product are **Keystatic local storage** and **Tina local filesystem GraphQL**—both treat the working tree as the write target during development. Pages CMS and default Decap optimize for **remote Git + editor auth**, which is useful as schema/UI prior art but wrong as the v1 runtime posture. Kirby is not a git-CMS; borrow its **blocks fieldsets** and **`translate: false`** semantics for open threads, not its Panel architecture.

## Short comparison

| System | Schema → UI | Write-back posture | Collections / body | Blocks / layout | Locale alternatives | Fit for this shell |
| --- | --- | --- | --- | --- | --- | --- |
| **Pages CMS** | Repo-root `.pages.yml` defines `content` + `fields` (`type` drives editor); reusable `components`; custom fields export Zod `schema` + React edit/view + `read`/`write` | Edits commit through GitHub (app); self-host still needs Postgres + GitHub App—not filesystem-first | `collection` / `file` / `group`; special `body` key for below-frontmatter content | `block` = polymorphic object shapes in one list | Not a primary documented locale model in the fields overview | **Borrow field registry + custom-field package shape; reject hosted GitHub write path for v1** |
| **Keystatic** | TS `keystatic.config` + `fields.*` factories generate Admin UI | `storage.kind: 'local'` writes the local filesystem; also `github` / `cloud` | `collections` (+ path/slug/format); `format.contentField` for single-file frontmatter + body | Document/Markdoc **component blocks** with per-block schema; `array` of `object`; `conditional` | No first-class Kirby-style locale files in core docs reviewed | **Borrow local mode + typed field factories; leave parallel React admin / cloud modes** |
| **Decap CMS** | `config.yml` `collections[].fields[]` with `widget` → UI | Default: remote Git backends + auth. Dev escape hatch: `local_backend` + `npx decap-server` proxy to local dir | Folder vs file collections; conventional `body` markdown field | Nested `object` / `list`; variable-type lists for mixed shapes | First-class `i18n`: `multiple_folders` / `multiple_files` / `single_file`; field `i18n: true \| duplicate` | **Borrow widget registry + collection shapes + i18n vocabulary for open thread; reject OAuth backends and prefer in-process write over second proxy process** |
| **TinaCMS** | `tina/config` schema drives form UI **and** generated client/types | `tinacms dev`: local filesystem GraphQL (no cloud token in local-mode); prod → TinaCloud or self-hosted backend | Collections with `path` / fields; `isBody` / `isTitle` conventions | `object` + `list` + `templates` = blocks; optional visual selector | Separate globalization docs exist; not required for local schema→UI | **Borrow schema→UI (+ optional codegen) and local FS authoring; reject GraphQL/TinaCloud as v1 requirements** |
| **Kirby** | YAML blueprints → Panel fields (PHP app, not Astro/git-CMS) | Panel writes content files on the server; not “commit to GitHub” as the product | Blueprint-driven pages/files | **`blocks`** with `fieldsets` (available-blocks list); **`layout`** = columns + blocks + settings | Per-locale content files; `translate: false` → readonly outside default language | **Borrow fieldsets + translate semantics for open threads; reject Panel/server CMS and v1 layout-grid** |

## System notes (primary sources)

### Pages CMS

- Positioned as a CMS for static sites in GitHub repos: configure `.pages.yml`, sign in, edit, save back to GitHub—no separate content database for the site files themselves ([Introduction](https://pagescms.org/docs/)).
- `.pages.yml` is the single source of truth: `media`, `content`, `components`, `settings`, `actions` ([Configuration overview](https://pagescms.org/docs/configuration/)).
- Field keys (`name`, `type`/`component`, `required`, `hidden`, `readonly`, …) and built-in types including `block`, `object`, `reference`, `rich-text`, plus special `body` for frontmatter formats ([Fields](https://pagescms.org/docs/configuration/content/fields/)).
- Custom fields: folder under `fields/custom` exporting Zod `schema`, optional `read`/`write`, `EditComponent` / `ViewComponent`, `defaultValue` ([Creating a custom field](https://pagescms.org/docs/guides/creating-custom-field/); [fields/custom README](https://github.com/hunvreus/pagescms/blob/main/fields/custom/README.md)).
- Local/self-host install still wires **PostgreSQL + GitHub App** ([Install locally](https://pagescms.org/docs/guides/installing/), [Self-host](https://pagescms.org/docs/guides/installing/self-host/))—so “run locally” ≠ “write the working tree without GitHub.”

### Keystatic

- `storage: { kind: 'local' }` stores content on the local filesystem; CLI starters default to local ([Local mode](https://keystatic.com/docs/local-mode)).
- Config also supports `github` and `cloud` storage kinds ([Configuration](https://keystatic.com/docs/configuration)).
- Collections declare `schema` with `fields.*`; format options include YAML/JSON data and Markdoc/MDX; `format.contentField` merges body into one file with frontmatter ([Collections](https://keystatic.com/docs/collections), [Format options](https://keystatic.com/docs/format-options)).
- Rich-text **component blocks** carry nested field schemas; `array` + `object` + `conditional` support structured lists and branching UI ([Document field](https://keystatic.com/docs/fields/document), [Array](https://keystatic.com/docs/fields/array), [Conditional](https://keystatic.com/docs/fields/conditional)).

### Decap CMS

- Collections + `fields` with `widget` define editor UI and how values land in files ([Configure Decap CMS](https://decapcms.org/docs/configure-decap-cms/), [Configuration options](https://decapcms.org/docs/configuration-options/), [Widgets](https://decapcms.org/docs/widgets/)).
- Without `local_backend`, the admin talks to the **hosted** repo via a Git backend—even when the UI is opened locally ([Configuration options](https://decapcms.org/docs/configuration-options/) note on remote commits).
- Repo-local editing: `local_backend` + `npx decap-server` proxy ([Decap Proxy](https://decapcms.org/docs/decap-proxy/)).
- i18n: top-level structure (`multiple_folders` | `multiple_files` | `single_file`) and per-field `i18n: true` / `duplicate` ([i18n Support](https://decapcms.org/docs/i18n/)).

### TinaCMS

- Schema in `tina/config` defines collections/fields that drive the editor ([Fields](https://tina.io/docs/reference/fields), [The Schema](https://tina.io/docs/reference/schema)).
- Local development: CLI `tinacms dev` runs a filesystem GraphQL API; cloud `token` / `clientId` / `branch` are unused in local-mode ([CLI overview](https://tina.io/docs/cli-overview), [Content API overview](https://tina.io/docs/features/data-fetching)).
- Blocks: `object` + `list` + `templates`; optional visual selector ([Using Tina as a Website Builder](https://tina.io/docs/editing/blocks)).
- Repo-based media paths under `media.tina` ([Repo-based Media](https://tina.io/docs/reference/media/repo-based)).
- Production paths emphasize TinaCloud or a self-hosted backend with auth/DB/Git provider ([Self-hosting Tina](https://tina.io/docs/self-hosted/overview))—out of product scope for v1.

### Kirby

- **Blocks** field: ordered block types constrained by `fieldsets` (including groups); `translate` on the field ([Blocks](https://getkirby.com/docs/reference/panel/fields/blocks)); custom blocks via inline or blueprint fieldsets ([Custom blocks](https://getkirby.com/docs/guide/page-builder/custom-blocks)).
- **Layout** field: selectable column layouts + same fieldsets + optional layout settings ([Layout](https://getkirby.com/docs/reference/panel/fields/layout)).
- Locales: one content file per language; Panel language switcher; `translate: false` makes a field readonly in non-default languages ([Translating your content](https://getkirby.com/docs/guide/languages/translating-content)).

## Take / leave for this authoring shell

### Take

1. **Dev write-back to the working tree** (Keystatic `local`; Tina `tinacms dev` filesystem API; Decap `local_backend` idea)—aligns with files-only write-back v1 and “no always-on CMS server.” Prefer **in-process Astro routes** over a second proxy process when possible.
2. **Field schema as a registry**: type/widget → validation + Svelte editor component (Decap widgets, Pages field types, Tina field types). Map onto `@cms/fields` + `@cms/components`.
3. **Custom field package shape** from Pages: Zod (or equivalent) `schema` + edit UI + optional read/write coercion—without requiring React or their GitHub App host.
4. **Collection vs singleton/file** modeling (Pages `collection`/`file`, Decap folder/file, Keystatic collection/singleton).
5. **Body / contentField convention** for markdown-ish entries (Pages `body`, Decap `body`, Keystatic `format.contentField`, Tina `isBody`).
6. **Polymorphic blocks as a field**, not a separate CMS: Pages `block`, Tina `templates`, Kirby `fieldsets` / available-blocks list—feed the **`blocksLayout` open thread** only; do not lock a deep contract in the core v1 route.
7. **Locale flags vocabulary** for the **`i18n` open thread**: Kirby `translate: false`; Decap per-field translate vs duplicate and file layout options—do not ship full side-by-side i18n UI in v1.
8. **Reusable field fragments** (Pages `components`) as a pattern for shared SEO/meta objects in schemas.

### Leave (explicitly reject for v1 / core route)

1. **Remote Git + OAuth / GitHub App as the primary write path** (Pages default, Decap default backends, TinaCloud)—conflicts with repo-local, auth-out-of-scope posture.
2. **Always-on CMS control plane** (Pages Postgres app; Tina self-hosted auth/DB stack; Kirby Panel server).
3. **Schema parallel to Astro that never reconciles** with content collections—Keystatic/Tina/Decap/Pages all use a **second** config file; this product should prefer **Astro-adjacent / derived field schemas** (see related tickets) over “maintain `.pages.yml` forever.”
4. **GraphQL content API as a hard dependency** (Tina)—fine as inspiration for typed queries later; not required to generate forms or write files.
5. **Editorial workflow / merge-mode / Actions buttons** as v1 shell features (Decap editorial workflow; Pages `settings` / `actions`)—open thread territory at best (shell commands).
6. **Non-developer hosted admin** and preview hosting.
7. **Kirby layout grid** as a v1 requirement—keep under `blocksLayout` open thread; ship simpler block lists first if anything.
8. **React field components** as the extension API—shell UI is Svelte; borrow the *shape* of Pages custom fields, not the React runtime.
9. **Decap i18n side-by-side UI** and multi-structure persistence as a closed decision—reference only for the open `i18n` thread.

## Implications for the buildable spec (non-binding)

- Position the shell as **dev integration** that generates editors from **field schemas** and **write-back**s to content files—closest product cousins: Keystatic local + Tina local, with Pages-like field extensibility.
- Cite Decap/Pages for the **widget/type catalog** and collection shapes; cite Kirby only for **blocks fieldsets** and **locale alternative** semantics on open threads.
- Do not inherit “CMS = GitHub App + auth + hosted UI” from Pages/Decap as the default architecture.

## Sources

- Pages CMS: [docs intro](https://pagescms.org/docs/), [configuration](https://pagescms.org/docs/configuration/), [fields](https://pagescms.org/docs/configuration/content/fields/), [custom fields](https://pagescms.org/docs/guides/creating-custom-field/), [custom fields README](https://github.com/hunvreus/pagescms/blob/main/fields/custom/README.md), [install locally](https://pagescms.org/docs/guides/installing/), [self-host](https://pagescms.org/docs/guides/installing/self-host/)
- Keystatic: [local mode](https://keystatic.com/docs/local-mode), [configuration](https://keystatic.com/docs/configuration), [collections](https://keystatic.com/docs/collections), [format options](https://keystatic.com/docs/format-options), [document / component blocks](https://keystatic.com/docs/fields/document), [array](https://keystatic.com/docs/fields/array), [conditional](https://keystatic.com/docs/fields/conditional)
- Decap: [configure](https://decapcms.org/docs/configure-decap-cms/), [configuration options](https://decapcms.org/docs/configuration-options/), [widgets](https://decapcms.org/docs/widgets/), [decap-proxy / local_backend](https://decapcms.org/docs/decap-proxy/), [i18n](https://decapcms.org/docs/i18n/)
- Tina: [schema](https://tina.io/docs/reference/schema), [fields](https://tina.io/docs/reference/fields), [CLI](https://tina.io/docs/cli-overview), [content API / local-mode](https://tina.io/docs/features/data-fetching), [blocks](https://tina.io/docs/editing/blocks), [repo-based media](https://tina.io/docs/reference/media/repo-based), [self-hosting](https://tina.io/docs/self-hosted/overview)
- Kirby: [blocks](https://getkirby.com/docs/reference/panel/fields/blocks), [layout](https://getkirby.com/docs/reference/panel/fields/layout), [custom blocks](https://getkirby.com/docs/guide/page-builder/custom-blocks), [translating content](https://getkirby.com/docs/guide/languages/translating-content)
