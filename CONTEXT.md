# Astro Dev CMS

Domain language for a server-light authoring shell over Astro content collections, validated first-party on a real local Astro host.

## Language

**Authoring shell**:
The UI an editor uses at author-time to create and change content entries. Not a production runtime CMS server.
_Avoid_: CMS server, admin panel, dashboard

**Self-host validation**:
Proving the authoring shell by running it on a real local Astro project (especially `@cms/astro-template`), not only via docs or demos.
_Avoid_: dogfood, dogfooding, dogfoodable

**Dev integration**:
How the authoring shell is hooked into an Astro project so it runs during local development (and can be pulled in from GitHub without a polished registry release). Consumer code imports the public API from `@cms/routes` only (re-exports builders/`config`/integration).
_Avoid_: install, plugin (unless naming a specific Astro/Vite plugin)

**Shell UI**:
The Svelte interface rendered inside the Astro-hosted authoring shell.
_Avoid_: admin SPA, CMS frontend

**Field schema**:
The per-field definition that pairs a validation/type schema with UI metadata used to generate editors. In this product, usually a Zod schema with FieldUi on `.meta()` (builders return Zod for Astro).
_Avoid_: Astro schema alone, Zod schema alone, form config

**FieldUi**:
UI metadata on a field: a `widget` key (and optional label/options), and/or a direct editor `ui` binding such as a Svelte component on Zod `.meta()`.
_Avoid_: form config, widget map alone

**Field registry**:
The map from `widget` identity to default validation helpers and UI used to generate editors; field-level `meta.ui` can override.
_Avoid_: widget map (Decap-only sense), component library

**Write-back**:
The path by which edits from the authoring shell land in project files (or a local store that later syncs to files).
_Avoid_: persistence, save API, storage backend

**Content entry**:
One unit of content addressed by the shell (a file or logical document in a collection).
_Avoid_: page, document, post (unless collection-specific)

**Collection**:
An Astro content collection whose entries the shell can list and edit.
_Avoid_: content type, model (Payload sense)

**Form shell**:
The Svelte UI that turns a field schema (or derived JSON Schema) into an editable form for one content entry.
_Avoid_: admin form, CMS form

**Schema builder**:
An (open-thread) authoring-shell capability to define or edit field schemas through UI rather than only in code.
_Avoid_: form builder (sjsf demo sense), content editor

**Write mode**:
Domain-level content ops (list/get/upsert/delete…) for the authoring shell; constructed with an injected **writer**, not a runtime string enum.
_Avoid_: storage backend, persistence driver

**Writer**:
A concrete implementation plugged into **write mode** that performs reads/writes (e.g. local FS, later other backends). Injected as a value, not selected by a runtime string enum.
_Avoid_: storage backend, adapter (unless naming a specific Astro adapter)

**Open thread**:
A decision or feature deliberately left unresolved on the map: in scope later, not part of the current destination’s closed route.
_Avoid_: backlog item, nice-to-have (unless listed as such), out of scope

