---
status: accepted
---

# Triple compile of Editor configuration is intentional (for now)

The same CMS-first unified tree may be compiled independently in three places:
schema-partition load (content.config generation), package-default CmsHost
assembly, and browser mount (`editorCollectionsFromTree`). That is accepted
while `compileSemanticIr` stays deterministic and no measured compile-cost or
drift bug forces a shared artifact.

Do **not** introduce a durable shared IR for generate + default host yet, and do
**not** replace `virtual:@cms/config` with a generated browser schema. Live
catalog bindings stay Vite-only; generation stays Svelte-free
([ADR-0016](0016-astro-convention-install-surface.md),
[ADR-0019](0019-cms-first-semantic-schema.md)).

Optional partition `ir` export may skip compile on the generate path only; it
is not a product requirement that hosts precompile.

Revisit a generate+host IR artifact only with concrete pain (slow compile,
observed divergence). Extends ADR-0016 / 0019.
