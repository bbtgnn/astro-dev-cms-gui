---
status: accepted
---

# Semantic projection peers stay; product depth is elsewhere

`@cms/core/semantic` keeps peer projection faces — `projectFormModels`,
`persistedProjections`, and `createAuthoritativeValidator` — matching the three
projection *kinds* in [ADR-0010](0010-persisted-input-with-environment-schema-projections.md)
/ [ADR-0019](0019-cms-first-semantic-schema.md). Do not collapse those kinds into
one schema language, and do not add a fourth “project everything” facade on the
semantic package just to shorten test fixtures.

Product composition depth lives on the authoring mount
(`editorCollectionsFromTree`) and the package-default CmsHost
(`buildDefaultFsHost` via `@cms/astro/testing`). Emit consumes
`astroSchemaPlan` from `persistedProjections`. That is enough for typical
callers.

Rejected: a single `projectFromIr`-style semantic facade, and unexporting
`createAuthoritativeValidator` solely because the wrap is thin — injectable
image/reference deps still earn that module.

Revisit a semantic composition facade only if many new call sites start
hand-assembling all three projections outside host/authoring.
