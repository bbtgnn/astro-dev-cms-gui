---
status: accepted
---

# One persisted-input model, projected for editor and Astro

The authoring shell edits one semantic content model through environment-specific schema projections:

- The **editor projection** (form model) is browser-safe, validates persisted
  input, and carries stock-by-kind editors plus optional form-tree chrome /
  catalog bindings.
- The **authoritative input validator** is component-free, runs server-side with
  async Zod / Standard Schema parsing, and accepts the same persisted input
  shape.
- The **Astro projection** is the user’s native `content.config` schema (with
  content-proxy stamps for image / reference kinds). Templates keep Astro’s
  output transforms and collection inference.

Images and relations retain semantic identity until projection. The CMS protocol
carries their persisted input values (asset paths and entry identities), never
Astro-transformed output such as image metadata.

Authoritative validation must not write transformed Astro output. It validates
persisted input and serializes that input after acceptance.

**Amended by [ADR-0025](0025-schema-first-content-config-optional-overlay.md):**
persisted Input authority is the stamped schema (Zod / Astro content.config),
not a user-authored CMS IR. Content-field stamps
([ADR-0024](0024-content-field-stamps-live-in-core.md)) recover image / file /
reference kinds. Historical CMS-first IR authority:
[ADR-0019](0019-cms-first-semantic-schema.md) (superseded).
