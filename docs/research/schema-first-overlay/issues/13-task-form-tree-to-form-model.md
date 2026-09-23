# 13 — Lower form tree → form model layout

Type: task  
Status: resolved  
Blocked by: [12](./12-task-form-tree-builders.md)

## Goal

Project a collection schema + optional form tree into `CollectionFormModel`: field descriptors from schema/stamps; layout from the form tree; chrome from field refs. Unplaced schema keys append to a default stack (ADR-0011).

## Acceptance

- [x] `projectSchemaFormModel` (or sibling) accepts optional form tree  
- [x] Tabs / columns / group appear in `layout` as today IR-derived models do  
- [x] Field ref chrome merges onto descriptors (label, editor binding, kind hints)  
- [x] Nested object `.fields` / `.form` scopes paths correctly (`seo.description`, …)  
- [x] Missing form tree → flat stack + stock-by-kind (current behavior)  
- [x] Unknown field keys in the tree fail closed (throw or typed-only; pick one + test)  
- [x] Tests: posts-like schema with tabs + nested seo object scope

## Notes

Path-map `SchemaFormOverlay` was a temporary apply path until Astro migrated to
`form` (ticket 14); removed after the form-tree phase.
