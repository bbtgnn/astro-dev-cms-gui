# Dev CMS

Domain language for a host-agnostic authoring shell over file-backed content collections. Primary usage: a **dev-mode route** inside the host app. Astro is the first host; filesystem write-back is the first adapter.

## Language

### Product / delivery

**Dev CMS**:
The product: a local CMS that mounts an authoring shell in the host app. Slug
`dev-cms`; npm packages remain `@cms/*`.
_Avoid_: Astro Dev CMS, astro-dev-cms, astro-dev-cms-gui

**Authoring shell**:
The UI an editor uses at author-time to create and change content entries.
_Avoid_: CMS server, admin panel, dashboard

**Shell UI**:
The Svelte interface rendered inside the host-mounted authoring shell.
_Avoid_: admin SPA, CMS frontend

**Dev integration**:
How the authoring shell is hooked into a host project for local development
(dev-only by default).
_Avoid_: install, plugin (unless naming a specific Astro/Vite plugin)

**Reference host**:
An in-repo app under `demos/` used for self-host validation; libraries stay in
`packages/`. Sample consumers, not the product identity.
_Avoid_: dogfood app, prototype template (as the product name), `@cms/astro-template`

**Self-host validation**:
Running the authoring shell on a real local reference host to prove integration
and write-back — not only via docs.
_Avoid_: dogfood, dogfooding, dogfoodable

### Content + overlay

**Collection**:
A named set of content entries the shell can list and edit.
_Avoid_: content type, model (Payload sense)

**Content entry**:
One unit of content addressed by the shell (a file or logical document in a
collection).
_Avoid_: page, document, post (unless collection-specific)

**Editor configuration**:
Optional host module that exports a presentation overlay (form trees, leaf
chrome, preview URL mapping). Persisted shape and location stay in the host
content schema, not here.
_Avoid_: cms.config as a server discovery registry, content.config (for the browser edge), CMS unified tree (as the required human source), FieldUi, Field schema

**Form tree**:
The presentation tree for one collection’s editor: layout nodes plus field refs
with chrome. Does not declare persisted shape.
_Avoid_: ui+layout maps (as two peer authoring surfaces), FieldUi-on-Zod, FieldUi, Field schema, IR `s.field` algebra (as the user face)

**Field ref**:
A typed reference to a key in a collection’s persisted Input shape, used in a
form tree for placement and chrome. Not a durable schema node.
_Avoid_: Field schema, s.field, form field (SJSF sense), FieldUi

### Browser editing

**Form model**:
The browser editor projection for one collection: JSON Schema plus layout and
field bindings, without live Svelte values.
_Avoid_: Zod editor schema, content.config schema, SJSF uiSchema (as the Form model itself), IR form model (as the product face)

**Form shell**:
The Svelte UI that turns a form model into an editable form for one content
entry.
_Avoid_: admin form, CMS form

**Authoring session**:
The in-browser owner of one content-entry edit against the CMS protocol. The
shell UI is a thin view over it.
_Avoid_: autosave controller (as the public face), editor store, form state manager

**Field registry**:
The map from semantic field kind to default validation helpers and stock
editors.
_Avoid_: widget map (Decap-only sense), component library

### Protocol / host

**CMS protocol**:
The serializable write-back face the authoring shell talks to. Entry identities
and `data`, not filesystem paths.
_Avoid_: save API, REST CRUD, WriteMode (as a public API), content.config discovery (as the editor seam), createCmsProtocol

**Write-back**:
The path by which edits from the authoring shell land in project files (or a
local store that later syncs to files).
_Avoid_: persistence, save API, storage backend, Write mode (as a second public face)

**Writer**:
A concrete read/write implementation injected into write-back (e.g. local FS,
in-memory), not selected by a runtime string enum.
_Avoid_: storage backend, adapter (unless naming a specific Astro adapter)

**Portable CMS HTTP**:
Injectable pairing of CmsHost + HTTP dispatcher from a portable `defineCms`
result and content root.
_Avoid_: mountDefineCms, Astro protocol-route (as this face)

**Stamped CMS assemble**:
Injectable pairing of CmsHost + form models from one stamped collection graph
(plus optional form trees) for the Astro package-default path.
_Avoid_: createDefaultCms, package-default CMS ready, dual materialize (as the product face)

### Map language

**Open thread**:
A decision or feature deliberately left unresolved on the map: in scope later,
not part of the current destination’s closed route.
_Avoid_: backlog item, nice-to-have (unless listed as such), out of scope

**Schema builder**:
An open-thread authoring-shell capability to define or edit field schemas
through UI rather than only in code.
_Avoid_: form builder (sjsf demo sense), content editor
