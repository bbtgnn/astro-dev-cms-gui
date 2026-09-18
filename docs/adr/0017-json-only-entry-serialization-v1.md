---
status: accepted
---

# JSON-only entry serialization in the FS adapter (v1)

For the **filesystem adapter**, editable entries round-trip as one JSON document ↔ full `data`. Classic `.md`/`.mdx` frontmatter+body / `contentField` / multi-segment write-back is deferred. `widget: 'markdown'` may still edit string fields; values persist as JSON strings, not as markdown file bodies.

Serialization is an adapter concern. The CMS protocol carries `data`; it does not prescribe on-disk format.

Supersedes [ADR-0006](0006-yaml-only-entry-serialization-v1.md) (YAML was equivalent complexity for one-document round-trip; JSON drops the `yaml` dependency and the `.yaml`/`.yml` dual-extension seam).
