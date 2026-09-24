# 11 — Research lock: form tree + non-Astro defineCms + demos/

Type: research  
Status: resolved  
Blocked by: —

## Goal

Capture grill decisions for the next exploration phase so implementation tickets share one Answer.

## Answer

See [plan-form-tree-and-non-astro.md](../plan-form-tree-and-non-astro.md) § Settled decisions.

**Highlights:**

- One **form tree** (fluent field refs + layout); not separate `ui` / `layout` maps.  
- Field ref ≠ Field schema; Zod/schema remains validation authority.  
- Object enter = callback scope for type safety.  
- Tabs = `{ id, label?, content }` objects; columns = child arrays; `group` in v1.  
- Two `defineCms` faces: Astro options-only (`@cms/astro`); non-Astro helper on `@cms/core`.  
- Self-host apps under top-level **`demos/`**; SvelteKit non-Astro demo there.  
- Custom editors = string catalog keys; live Svelte stays in a catalog map.

## Acceptance

- [x] Decisions written into phase plan  
- [x] Follow-on tickets 12–17 filed  
- [x] Glossary terms updated in CONTEXT for exploration language (Form tree, Field ref, demos/)
