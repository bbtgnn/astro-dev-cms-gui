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

Path-map `SchemaFormOverlay` may remain as a temporary apply path until Astro migrates to `form` (ticket 14).

## Delivered

- `projectSchemaFormModel(schema, { form? })` — optional `FormTree` lowers into `CollectionFormModel.layout`
- Runtime fail-closed: unknown field-ref paths throw (`Unknown field key in form tree: "…"`)
- Unplaced top-level (and nested object-scope) keys append after explicit placement
- Path-map `overlay` still applied after form-tree chrome (temporary until ticket 14)
- Tests: `packages/core/scripts/schema-form-projection.test.ts` (`projectSchemaFormModel with form tree`)
