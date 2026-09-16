---
status: accepted
---

# Block schemas and production renderers stay separate

A blocks field persists an ordered discriminated collection whose items carry a block type and that type's content.

The form shell uses SJSF to render the selected union branch as a nested part of the same form. FieldUi and direct editor bindings inside block schemas continue to apply. Add, reorder, duplicate, remove, defaults, and validation are editor behaviors governed by configured capabilities.

Block schema definitions remain runtime-neutral and safe for server/build schema use. Production renderer bindings live in a separate typed registry whose keys must match the schema registry.

The authoring shell does not require a duplicate inline preview renderer for every block. Production rendering belongs to the site; a browser-safe shared renderer may be added as an optional preview mode later.
