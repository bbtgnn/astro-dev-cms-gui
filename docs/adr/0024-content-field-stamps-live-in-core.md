---
status: accepted
---

# Content-field stamps live in `@cms/core`

Schema-first image / file / reference kinds are recovered from marks on Zod
leaves (Symbol + `.meta.cms`), not FieldUi-on-Zod. Portable `defineCms` and
Astro content-proxy both attach those marks; form projection, persisted-Input
rewrite, and Input codegen all read them.

**Decision:** the content-field stamp contract (symbol, types, attach, read,
unwrap) lives in `@cms/core` under the semantic face. Astro’s content-proxy
keeps only the host adapter that wraps Astro `image()` / `reference()` onto
that contract. Loader stamps (`glob` / `file` location) stay Astro-owned —
they are host-loader metadata, not portable schema semantics.

**Rejected:** keeping the contract under `@cms/astro` (forces core to duplicate
or import the host package for portable hosts). Unifying form projection and
Input rewrite into one walk engine is deferred; shared attach/read/unwrap is
enough locality for the repeated seam.

Clarifies package gravity relative to
[ADR-0018](0018-three-packages-for-adr-0008-layers.md); does not change
[ADR-0010](0010-persisted-input-with-environment-schema-projections.md)
(one persisted-input model, environment projections).
