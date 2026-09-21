---
status: accepted
---

# SJSF is the internal form engine; layout stays inside one form

The form shell uses SJSF for schema-driven field creation, form state, validation, bindings, IDs, and submission.

Semantic fields, FieldUi (ADR-0019 catalog / stock-by-kind sense), and recursive
layout declarations are the normal authoring interface. Raw SJSF widget, field,
and template slots remain an explicit advanced escape hatch; the authoring shell
does not mirror the whole SJSF interface as its own public contract.

Tabs, grids, groups, accordions, and blocks remain inside one SJSF form instance. Layout arranges fields that SJSF already created and never changes the persisted data shape merely for presentation.

The layout model is an object-local recursive field/group tree with:

- stack, grid, tabs, and later accordion presentations;
- automatic vertical fallback for fields not explicitly placed;
- simple ordering and grids lowered to SJSF UI options where sufficient;
- richer composition rendered by authoring-shell templates;
- accessible tab state, error indicators, and navigation to invalid fields.

The exact public TypeScript syntax, deep-path policy beyond object-local fields, and stable custom-field contract remain open.

**Amended by [ADR-0019](0019-cms-first-semantic-schema.md):** layout and FieldUi
are authored in the CMS unified tree; Zod `.meta()` FieldUi is historical.
