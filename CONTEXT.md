# Astro Dev CMS

Domain language for a dogfoodable, server-light authoring shell over Astro content collections.

## Language

**Authoring shell**:
The UI an editor uses at author-time to create and change content entries. Not a production runtime CMS server.
_Avoid_: CMS server, admin panel, dashboard

**Dev integration**:
How the authoring shell is hooked into an Astro project so it runs during local development (and can be pulled in from GitHub without a polished registry release).
_Avoid_: install, plugin (unless naming a specific Astro/Vite plugin)

**Shell UI**:
The Svelte interface rendered inside the Astro-hosted authoring shell.
_Avoid_: admin SPA, CMS frontend

**Field schema**:
The per-field definition that pairs a validation/type schema with UI metadata used to generate editors.
_Avoid_: Astro schema alone, Zod schema alone, form config

**Write-back**:
The path by which edits from the authoring shell land in project files (or a local store that later syncs to files).
_Avoid_: persistence, save API, storage backend

**Content entry**:
One unit of content addressed by the shell (a file or logical document in a collection).
_Avoid_: page, document, post (unless collection-specific)

**Collection**:
An Astro content collection whose entries the shell can list and edit.
_Avoid_: content type, model (Payload sense)

**Open thread**:
A decision or feature deliberately left unresolved on the map: in scope later, not part of the current destination’s closed route.
_Avoid_: backlog item, nice-to-have (unless listed as such), out of scope
