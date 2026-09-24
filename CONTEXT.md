# Astro Dev CMS

Domain language for a server-light authoring shell over Astro content collections.
Primary usage: a **dev-mode route** inside an Astro project. The authoring UI stays
backend-agnostic; Astro + filesystem write-back is the first host path.

## Language

**Authoring shell**:
The UI an editor uses at author-time to create and change content entries. Not a production runtime CMS server.
_Avoid_: CMS server, admin panel, dashboard

**Self-host validation**:
Running the authoring shell on a real local host app under `demos/` (Astro and/or
SvelteKit reference hosts) to prove integration and write-back — not only via docs.
_Avoid_: dogfood, dogfooding, dogfoodable

**Dev integration**:
How the authoring shell is hooked into an Astro project so it runs during local development (dev-only by default). Consumer Astro hosts use `@cms/astro` (`cms()`) with convention defaults: required `src/content.config.ts` (stamped), optional `src/cms.config.ts` / `src/cms.components.ts` overlay, content under `src/content/`. Portable `defineCms`, stamps, and the CMS protocol live in `@cms/core`; the authoring UI lives in `@cms/authoring`.
_Avoid_: install, plugin (unless naming a specific Astro/Vite plugin)

**Editor configuration**:
Optional project module (`src/cms.config.ts` by convention) that exports a
`defineAstroCms` presentation overlay (form trees, leaf chrome) and optional
preview URL mapping. Compiled through the host Vite graph as `virtual:@cms/config`;
never mixed into the CMS protocol. Live Svelte editors live in
`src/cms.components.ts` (`virtual:@cms/components`). Persisted shape and location
live in `src/content.config.ts`, not here.
_Avoid_: cms.config as a server discovery registry, content.config (for the browser edge), CMS unified tree (as the required human source)

**Reference host**:
The in-repo self-host apps under top-level `demos/` (libraries stay in
`packages/`): `demos/astro-simple` (`@cms/astro-demo-simple`),
`demos/astro-overlay` (`@cms/astro-demo`), and `demos/sveltekit`
(`@cms/sveltekit-demo`). Astro: content.config-only and optional overlay demos;
non-Astro: SvelteKit via portable `defineCms` (no `@cms/astro`). Astro overlay
presentation uses `defineAstroCms` in `cms.config.ts`. Sample consumers, not
the product identity.
_Avoid_: dogfood app, prototype template (as the product name), `@cms/astro-template` (removed)

**Form tree**:
The presentation tree for one collection’s editor: layout nodes (tabs, columns,
group, default stack) plus **field refs** with fluent chrome. Does not declare
persisted shape; schema (Zod / Astro content.config) remains validation
authority. Not a CMS-first unified IR tree.
_Avoid_: ui+layout maps (as two peer authoring surfaces), FieldUi-on-Zod, IR `s.field` algebra (as the user face)

**Field ref**:
A typed reference to a key in a collection’s persisted Input shape, used inside
a form tree for placement and chrome (label, editor catalog key, kind hints).
Entering a nested object rebinds the helper via a callback scope for type
safety. Not a durable schema node.
_Avoid_: Field schema, s.field, form field (SJSF sense)

**Collection**:
A named set of content entries the shell can list and edit. On Astro hosts, an
Astro content collection; on non-Astro hosts, a host-declared schema + location
joined at `createCmsHost`.
_Avoid_: content type, model (Payload sense)

**Shell UI**:
The Svelte interface rendered inside the host-mounted authoring shell.
_Avoid_: admin SPA, CMS frontend

**Authoring session**:
The in-browser module that owns one content-entry edit against the CMS protocol:
statuses, draft-write eligibility (schema gate plus create-id when creating),
guarded write-back (revision chaining), preview eligibility after successful
save, form remount rules (create→edit, conflict reload), and the
authoring-facing asset upload (file → field path | message). Debounced autosave
is an internal seam. Opened only through a fail-closed open face: missing
collection form model (editor schema) → no session. The Shell UI is a thin
view over the session.
_Avoid_: autosave controller (as the public face), editor store, form state manager

**Field schema**:
Historical CMS-first IR node (persisted input type, semantic kind, constraints,
editor binding). Product authoring no longer uses a user-facing IR algebra;
prefer stamped Zod leaves and form-tree field refs.
_Avoid_: Astro schema alone, Zod schema alone, form config, Field ref (as synonyms for this historical IR node)

**FieldUi**:
Historical authoring UI bag on a CMS-first IR field (stock editor, catalog
`component` / `wrapper`, `props`). Schema-first chrome lives on form-tree field
refs; stamps carry image / file / reference kinds.
_Avoid_: form config, widget map alone, Zod meta UI, FieldUi-on-Zod

**Form model**:
The browser editor projection for one collection: JSON Schema plus layout and
field bindings, without live Svelte values. Produced by schema→form projection
(+ optional form tree). SJSF `uiSchema` is form-shell implementation after lower
— not part of the Form model.
_Avoid_: Zod editor schema, toFormSchemas output, content.config schema, SJSF
uiSchema (as the Form model itself), IR form model (as the product face)

**Field registry**:
The map from semantic field kind to default validation helpers and stock
editors; field-level catalog keys can override via the components catalog.
_Avoid_: widget map (Decap-only sense), component library

**Write-back**:
The path by which edits from the authoring shell land in project files (or a local store that later syncs to files).
_Avoid_: persistence, save API, storage backend

**CMS protocol**:
The serializable write-back face the authoring shell talks to (list/read/save/delete/assets/capabilities with typed outcomes). Entry identities, not filesystem paths. Hosts construct it with `createCmsHost` from content root + writer + collection descriptors (from stamped or host-declared schemas). Asset upload stores original files; Astro (or the host) optimizes images at render, not at upload.
_Avoid_: save API, REST CRUD, WriteMode (as a public API), content.config discovery (as the editor seam), createCmsProtocol (removed alias)

**Portable CMS HTTP**:
The injectable face that builds a CmsHost and HTTP dispatcher from the createCmsHost `config` door (portable defineCms result) plus content root. Framework adapters supply path segments and verb exports; the authoring shell stays on authoringPropsFromDefineCms.
_Avoid_: mountDefineCms, Astro protocol-route (as this face — stamped path uses assemble instead)

**Stamped CMS assemble**:
The injectable face that turns one stamped collection graph (plus optional form trees) into the paired CmsHost and form models for the Astro package-default path. Thin host/shell adapters pick a field from that pair; they do not each invent a separate materialization path.
_Avoid_: createDefaultCms, package-default CMS ready, dual materialize (as the product face)

**Content entry**:
One unit of content addressed by the shell (a file or logical document in a collection).
_Avoid_: page, document, post (unless collection-specific)

**Form shell**:
The Svelte UI that turns a form model into an editable form for one content entry.
_Avoid_: admin form, CMS form

**Schema builder**:
An (open-thread) authoring-shell capability to define or edit field schemas through UI rather than only in code.
_Avoid_: form builder (sjsf demo sense), content editor

**Write mode**:
Internal filesystem write-back implementation (list/get/upsert/delete, path
rules, JSON, revisions) constructed with an injected **writer**. Not a second
public face beside the CMS protocol; hosts use `createCmsHost`.
_Avoid_: storage backend, persistence driver, parallel public write-back API

**Writer**:
A concrete implementation plugged into write-back that performs reads/writes
(e.g. local FS, in-memory). Injected as a value into protocol/host construction,
not selected by a runtime string enum.
_Avoid_: storage backend, adapter (unless naming a specific Astro adapter)

**Open thread**:
A decision or feature deliberately left unresolved on the map: in scope later, not part of the current destination’s closed route.
_Avoid_: backlog item, nice-to-have (unless listed as such), out of scope
