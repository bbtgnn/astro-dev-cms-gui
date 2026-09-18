---
status: accepted
---

# CMS protocol is the write-back seam; `/_cms` is an Astro transport

The principal external seam is a **CMS protocol**: serializable DTOs and domain ops (list/read/save with revisions, assets, capabilities, validation failures). Entry identities are `{ collection, id }` (plus `data` as Zod input) — never arbitrary filesystem paths.

The authoring UI talks only to that protocol (fetch client or equivalent). It must not import Node, filesystem paths, serializers, Sharp, or Git.

In the Astro host, the first transport is a catch-all **`/_cms/[...path]`** dispatcher (prefix configurable). Behind it, the **filesystem adapter** performs discovery, authoritative validation, serialization, atomic writes, and original asset storage (no authoring-time image preprocessing; see [ADR-0015](0015-store-original-assets-astro-optimizes.md)). An injectable in-memory implementation proves the same protocol. A remote backend may implement the protocol later; Astro is a host, not synonymous with “the backend.”

`runCommand` (and similar) remains a reserved seam, not part of the v1 protocol surface.
