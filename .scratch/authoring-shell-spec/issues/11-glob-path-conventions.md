# Glob and entry path conventions

Type: grilling
Status: resolved
Blocked by: 05, 08

## Question

Tighten `(collection, id) → filesystem path` for **v1 YAML entries** (see [Multi-markdown serialization](10-multi-markdown-serialization.md)): glob patterns, `.yaml`/`.yml` extensions, nested ids, create-entry path rules. MD/MDX path rules deferred with MD write-back.

## Answer

### Id ↔ path (YAML v1)

- **`id`** = path relative to collection loader **base**, without extension.  
  - `post-1` ↔ `<base>/post-1.yaml`  
  - Nested: `docs/intro` ↔ `<base>/docs/intro.yaml` (`/` → subdirectories)
- **Create extension:** prefer **`.yaml`**; accept existing **`.yml`** on read. Override via `config({ extension?: 'yaml' | 'yml' })`.
- **Loader base:** introspect Astro `glob({ base, pattern })` (and equivalents).  
  `path = allowlistedRoot + base + id + ext`.  
  Override when needed: `config({ base?, pathTemplate? })`.
- **Create (`upsertEntry`):** create intermediate directories; write under base; **refuse** path escape outside `allowPaths` (reject `..`, absolute ids, etc.).
- **List:** prefer Astro Content Layer index when available; **FS scan fallback** (`**/*.{yaml,yml}` under base / glob) so fresh creates appear before sync. `id` = relative path without extension.
- **Collision:** if both `id.yaml` and `id.yml` exist → **error** on get/upsert (no silent prefer/merge).

### Deferred

- MD/MDX extension and body-path rules (with MD file serialization).  
- Exact `pathTemplate` micro-syntax — implementer may use a minimal `{base}/{id}.{ext}` style when `pathTemplate` is set; tighten later if needed.

### Informed by

- [Write-back contract](05-write-back-contract.md)  
- [Collection and schema discovery](08-collection-discovery.md)  
- [Multi-markdown serialization](10-multi-markdown-serialization.md) — YAML-only v1  

## Comments

- 2026-09-09: Locked nested ids, .yaml prefer, glob introspection + config override, dual list, yaml/yml collision error.
