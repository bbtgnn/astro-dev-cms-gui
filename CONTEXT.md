# Astro Dev CMS

Domain language for a server-light authoring shell over Astro content collections.
Primary usage: a **dev-mode route** inside an Astro project. The authoring UI stays
backend-agnostic; Astro + filesystem write-back is the first host path.

## Language

**Authoring shell**:
The UI an editor uses at author-time to create and change content entries. Not a production runtime CMS server.
_Avoid_: CMS server, admin panel, dashboard

**Self-host validation**:
Running the authoring shell on a real local Astro project (especially the reference host `@cms/astro-template`) to prove integration and write-back — not only via docs or demos.
_Avoid_: dogfood, dogfooding, dogfoodable

**Dev integration**:
How the authoring shell is hooked into an Astro project so it runs during local development (dev-only by default). Consumer Astro hosts use `@cms/astro` (`cms()`) with convention defaults: `src/cms.config.ts` (human unified tree), generated `src/content.config.ts`, content under `src/content/`. Semantic IR and the CMS protocol live in `@cms/core`; the authoring UI lives in `@cms/authoring`.
_Avoid_: install, plugin (unless naming a specific Astro/Vite plugin)

**Editor configuration**:
The Node-safe project module (`src/cms.config.ts` by convention) that exports
the CMS unified tree (closed semantic schema, layout, loaders, string catalog
keys) and optional preview URL mapping. Compiled through the host Vite graph as
`virtual:@cms/config`; never mixed into the CMS protocol. Also the human source
and generation partition for `src/content.config.ts` (ADR-0019). Live Svelte
editors live in `src/cms.components.ts` (`virtual:@cms/components`).
_Avoid_: cms.config as a server discovery registry, content.config (for the browser edge)

**Reference host**:
The in-repo Astro app (`@cms/astro-template`) used to exercise and validate the product. It is a sample consumer, not the product identity.
_Avoid_: dogfood app, prototype template (as the product name)

**Shell UI**:
The Svelte interface rendered inside the Astro-hosted authoring shell.
_Avoid_: admin SPA, CMS frontend

**Authoring session**:
The in-browser module that owns one content-entry edit against the CMS protocol:
statuses, draft-write eligibility (schema gate plus create-id when creating),
guarded write-back (revision chaining), preview eligibility after successful
save, form remount rules (create→edit, conflict reload), and the
authoring-facing asset upload (file → field path | message). Debounced autosave
is an internal seam. The Shell UI is a thin view over the session.
_Avoid_: autosave controller (as the public face), editor store, form state manager

**Field schema**:
A durable node in the CMS semantic tree: persisted input type, semantic kind,
validation constraints, and optional editor binding (`component` / `props`).
Projected to browser form model, authoritative validator, and native Astro Zod.
_Avoid_: Astro schema alone, Zod schema alone, form config

**FieldUi**:
Authoring UI on a field or aggregate: stock editor from semantic kind, optional
catalog-key `component`, optional `wrapper` on objects/arrays, and explicit
`props`. Authored in the unified tree. Keys resolve to live Svelte modules via
the host components catalog.
_Avoid_: form config, widget map alone, Zod meta UI, FieldUi-on-Zod

**Form model**:
The browser editor projection of the IR for one collection: JSON Schema plus
layout and field bindings, without live Svelte values. Produced by compile +
project. SJSF `uiSchema` is form-shell implementation after lower — not part of
the Form model.
_Avoid_: Zod editor schema, toFormSchemas output, content.config schema, SJSF
uiSchema (as the Form model itself)

**Field registry**:
The map from semantic field kind to default validation helpers and stock
editors; field-level `component` can override via the components catalog.
_Avoid_: widget map (Decap-only sense), component library

**Write-back**:
The path by which edits from the authoring shell land in project files (or a local store that later syncs to files).
_Avoid_: persistence, save API, storage backend

**CMS protocol**:
The serializable write-back face the authoring shell talks to (list/read/save/delete/assets/capabilities with typed outcomes). Entry identities, not filesystem paths. Hosts construct it with `createCmsProtocol` / `createCmsHost` from content root + writer + collection descriptors (from compiled IR on the default host). Asset upload stores original files; Astro (or the host) optimizes images at render, not at upload.
_Avoid_: save API, REST CRUD, WriteMode (as a public API), content.config discovery (as the editor seam)

**Content entry**:
One unit of content addressed by the shell (a file or logical document in a collection).
_Avoid_: page, document, post (unless collection-specific)

**Collection**:
An Astro content collection whose entries the shell can list and edit.
_Avoid_: content type, model (Payload sense)

**Form shell**:
The Svelte UI that turns a form model into an editable form for one content entry.
_Avoid_: admin form, CMS form

**Schema builder**:
An (open-thread) authoring-shell capability to define or edit field schemas through UI rather than only in code.
_Avoid_: form builder (sjsf demo sense), content editor

**Write mode**:
Internal filesystem write-back implementation (list/get/upsert/delete, path
rules, JSON, revisions) constructed with an injected **writer**. Not a second
public face beside the CMS protocol; hosts use `createCmsProtocol` /
`createCmsHost`.
_Avoid_: storage backend, persistence driver, parallel public write-back API

**Writer**:
A concrete implementation plugged into write-back that performs reads/writes
(e.g. local FS, in-memory). Injected as a value into protocol/host construction,
not selected by a runtime string enum.
_Avoid_: storage backend, adapter (unless naming a specific Astro adapter)

**Open thread**:
A decision or feature deliberately left unresolved on the map: in scope later, not part of the current destination’s closed route.
_Avoid_: backlog item, nice-to-have (unless listed as such), out of scope
