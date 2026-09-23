# 03 — Schema → form model projection

Type: task  
Status: resolved  
Blocked by: [01](./01-research-done.md)

## Goal

Given a collection Zod/Standard Schema (Input) plus optional stamp meta (image/ref), produce browser form models usable by `@cms/authoring` (JSON Schema + ui/bindings for SJSF), without requiring the user-authored semantic IR tree.

## Context

Today: `compileSemanticIr` → `projectFormModels` → `editorCollectionsFromTree`.  
Target: schema-first projection; thin internal IR OK if it helps; not user-facing.

## Acceptance

- [x] Public (or `@cms/astro`/`@cms/core`) face: stamped schemas → `EditorCollectionInput` (or successor) per collection
- [x] Stock editors for string/number/boolean/object/array + stamped image/ref
- [x] Overlay application hook: nested path chrome (label, editor key, singleton later in 05/07) can merge without re-authoring schema
- [x] Tests for a posts-like schema with `image().optional()` + `reference("authors")`
- [x] Document Ajv client vs authoritative schema parse (dual engines OK)

## Notes

Do not resurrect FieldUi-on-Zod as the primary overlay API. Overlay is `defineCms` config (ticket 05/07).

## Delivered

- `@cms/core/semantic`: `projectSchemaFormModel(s)`, `applySchemaFormOverlay`
- `@cms/authoring`: `editorCollectionsFromSchemas` → `EditorCollectionInput`
- Docs: `packages/core/src/semantic/schema-form.md`
