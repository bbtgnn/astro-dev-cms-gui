---
status: superseded by ADR-0025
---

# Editor configuration is IR form model only

Superseded by
[ADR-0025](0025-schema-first-content-config-optional-overlay.md).

Historical decision under CMS-first: the authoring shell accepted only the IR
editor projection; no Zod / FieldUi-on-`.meta()` dual path and no package
default host that discovered editable schemas from live `content.config` via
FieldUi. That dual-seam rejection still holds; the product face is now stamped
schema → form model (+ optional form tree), not user-authored IR.
