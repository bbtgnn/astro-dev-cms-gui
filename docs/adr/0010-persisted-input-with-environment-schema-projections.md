---
status: accepted
---

# One persisted-input model, projected for editor and Astro

The authoring shell edits one semantic content model through environment-specific schema projections:

- The **editor projection** is browser-safe, validates persisted Zod input, and carries FieldUi plus host-compiled editor bindings.
- The **authoritative input validator** is component-free, runs server-side with async Zod parsing, and accepts the same persisted input shape.
- The **Astro projection** uses Astro's native schema helpers and preserves their output transforms and precise collection inference.

Images and relations retain semantic identity until projection. The CMS protocol carries their persisted input values (asset paths and entry identities), never Astro-transformed output such as image metadata.

Authoritative validation must not write transformed Astro output. It validates persisted input and serializes that input after acceptance.

The exact public schema-builder syntax, registry representation, and server-registry derivation remain open. Any implementation must preserve input parity across projections and exact Astro output inference.
