---
status: accepted
---

# Semantic projection peers stay; product depth is elsewhere

`@cms/core/semantic` keeps distinct projection faces for the kinds in
[ADR-0010](0010-persisted-input-with-environment-schema-projections.md) —
today primarily schema→form projection and persisted-Input rewrite beside the
stamp contract ([ADR-0024](0024-content-field-stamps-live-in-core.md)). Do not
collapse those kinds into one schema language, and do not add a fourth “project
everything” facade on the semantic package just to shorten test fixtures.

Product composition depth lives on stamped CMS assemble / portable
`defineCms` mounts and the authoring `authoringPropsFromFormModels` face
([ADR-0025](0025-schema-first-content-config-optional-overlay.md)). That is
enough for typical callers.

Rejected: a single `projectFromIr`-style semantic facade over removed IR
projections.

Revisit a semantic composition facade only if many new call sites start
hand-assembling all projections outside host/authoring.

Amended by [ADR-0025](0025-schema-first-content-config-optional-overlay.md)
(IR `projectFormModels` / `persistedProjections` / emit plans are historical).
