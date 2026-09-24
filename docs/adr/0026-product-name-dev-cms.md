---
status: accepted
---

# Product name is Dev CMS; packages stay `@cms/*`

The product is a **host-agnostic authoring shell** (Astro first host, not product
identity). Human-facing name: **Dev CMS**; repo/folder/root package slug:
`dev-cms`. npm package scope and names stay `@cms/*` (including `@cms/astro` as
the Astro host package).

**Why rename off “Astro Dev CMS”:** schema-first + portable `defineCms` made the
old name a lie in README/AGENTS while ADRs already described a backend-agnostic
UI. Keeping “CMS” preserves the Decap/Payload comparison; “Dev” signals
dev-route-first delivery for now.

**Why not rename packages yet:** high churn for little clarity; `@cms/astro`
correctly names the Astro adapter. Revisit scope/package names at publish time.

Amends public prose relative to historical “Astro Dev CMS” wording; does not
change layer packages ([ADR-0018](0018-three-packages-for-adr-0008-layers.md))
or install law ([ADR-0025](0025-schema-first-content-config-optional-overlay.md)).
