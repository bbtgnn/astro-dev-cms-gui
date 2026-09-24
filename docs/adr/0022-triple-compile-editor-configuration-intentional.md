---
status: superseded by ADR-0025
---

# Triple compile of Editor configuration is intentional (for now)

Superseded by
[ADR-0025](0025-schema-first-content-config-optional-overlay.md).

Historical under CMS-first generate: the unified tree could be compiled in
generate, default host, and browser mount independently. Product `cms()` no
longer generates or compiles user IR; stamped assemble + schema→form projection
are the shared path.
