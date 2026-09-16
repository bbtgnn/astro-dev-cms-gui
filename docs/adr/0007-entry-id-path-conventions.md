---
status: accepted
---

# FS adapter: entry `id` is the path relative to the loader base

Inside the **filesystem adapter** (YAML v1): `id` = path under the collection loader base without extension (`docs/intro` ↔ `<base>/docs/intro.yaml`). Prefer `.yaml` on create; accept existing `.yml` on read; error if both exist for the same id. Introspect glob `base` (override via `config({ base?, pathTemplate? })`). List via Content Layer when available, else FS scan. Refuse path escape outside `allowPaths`.

The CMS protocol exposes `id` as an opaque entry identity. Path conventions must not leak into the authoring UI.
