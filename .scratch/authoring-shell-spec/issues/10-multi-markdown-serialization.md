# Multi-markdown serialization

Type: grilling
Status: resolved
Blocked by: 05, 07, 08

## Question

Given write-back `{ id, collection, data }` with multiple `widget: 'markdown'` fields and no privileged Astro `body`: how do we **read/write** one on-disk content file (frontmatter + body/segments) ↔ `data`? Lock v1 rules for `@cms/crud` / writers without inventing `role`/`segment` FieldUi options (rejected in [Field schema model](07-field-schema-model.md)).

## Answer

### v1 decision: YAML only

- **On-disk format for editable entries in v1:** YAML files (`.yaml` / `.yml`).
- Entire entry **`data`** (Zod input object) **round-trips as one YAML document** — no frontmatter + below-fold body split.
- Classic **`.md` / `.mdx` write-back** (frontmatter, `contentField`, multi-segment markdown) is **deferred** — not in v1. Track as later fog after P0–P6 (or when markdown collections become a destination).
- **`widget: 'markdown'`** may still edit string fields; values persist as YAML strings (or nested structures), not as MD file bodies.
- **`@cms/astro-template` self-host:** sample collections use loaders over YAML (prefer YAML; JSON only if a loader forces it). No markdown collections required for P6 proof.
- Serialize/parse: FS writer / write-mode helpers (`parseEntryFile` / `serializeEntryFile`) for YAML ↔ `data`; format keyed by collection/path extension.

### Explicitly not in v1

- Keystatic-style `contentField` / Pages/Decap `body` mapping  
- Multiple markdown regions / delimiters in one file  
- Privileged Astro entry `body` channel in the shell API  

### Informed by

- [Write-back contract](05-write-back-contract.md) — `{ data }` payload  
- [Field schema model](07-field-schema-model.md) — no role/segment  
- [Collection and schema discovery](08-collection-discovery.md)  
- Simplicity cut (2026-09-09 grilling)

## Comments

- 2026-09-09: Closed as YAML-only v1; MD file serialization deferred.
