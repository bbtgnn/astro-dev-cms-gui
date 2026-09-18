---
status: accepted
---

# Authoring stores original assets; Astro optimizes at render

Amends [ADR-0005](0005-write-back-contract.md) and [ADR-0008](0008-backend-agnostic-ui-fs-first-adapter.md): the filesystem adapter does **not** preprocess images (no Sharp WebP/width pipelines at upload).

Primary delivery is a **dev-mode route** in a consumer Astro project. Astro already owns image optimization at render (`image()`, `<Image>`, `getImage`). Duplicating that at authoring time created a second pipeline, a multi-file folder convention (`cover.webp` + `{w}.webp`), and a host dependency (`sharp`) that the portable authoring UI should not need.

**Decision:** image (and similar) fields persist a **single path string** to one original file under the entry-adjacent asset folder (`{collectionBase}/{id}/{folder}/`, sanitized original filename). Upload writes those bytes as-is (with path/name sanitization and size limits). Re-upload to the same field folder replaces prior files in that folder. Site pages use Astro’s image APIs; editor preview may serve the single file via the existing allowlisted asset GET. Custom srcset helpers and multi-width `CmsImage` conventions are removed.

This preserves [ADR-0010](0010-persisted-input-with-environment-schema-projections.md) (protocol carries asset paths, not Astro-transformed metadata) and [ADR-0013](0013-real-astro-page-is-the-default-preview.md) (real Astro page owns presentation).
