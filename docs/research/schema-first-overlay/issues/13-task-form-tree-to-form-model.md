# 13 — Lower form tree → form model layout

Type: task  
Status: open  
Blocked by: [12](./12-task-form-tree-builders.md)

## Goal

Project a collection schema + optional form tree into `CollectionFormModel`: field descriptors from schema/stamps; layout from the form tree; chrome from field refs. Unplaced schema keys append to a default stack (ADR-0011).

## Acceptance

- [ ] `projectSchemaFormModel` (or sibling) accepts optional form tree  
- [ ] Tabs / columns / group appear in `layout` as today IR-derived models do  
- [ ] Field ref chrome merges onto descriptors (label, editor binding, kind hints)  
- [ ] Nested object `.fields` / `.form` scopes paths correctly (`seo.description`, …)  
- [ ] Missing form tree → flat stack + stock-by-kind (current behavior)  
- [ ] Unknown field keys in the tree fail closed (throw or typed-only; pick one + test)  
- [ ] Tests: posts-like schema with tabs + nested seo object scope

## Notes

Path-map `SchemaFormOverlay` may remain as a temporary apply path until Astro migrates to `form` (ticket 14).
