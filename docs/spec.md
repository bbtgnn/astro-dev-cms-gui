# Dev CMS — architecture index

Status: navigation document

Compact entry point for architecture. Not an ADR, backlog, open-thread answer,
or implementation spec. Durable decisions live in [ADRs](adr/); unresolved
product questions and implementation work live in GitHub Issues (map
[#1](https://github.com/bbtgnn/dev-cms/issues/1)). Authority order is in
[AGENTS.md](../AGENTS.md).

## Product direction

**North star:** the best **code-extensible building blocks** for a **tidy**
content editing experience over file-backed content collections (Astro first).

Steal Kirby’s panel *feel* (composable, calm) and Payload’s *config-in-code*
habit; reject Kirby’s YAML blueprints and Payload’s Next-shaped admin clunk.
The job is a local-first **authoring shell**, not a production CMS identity.

- **Building blocks (v1 surface):** stamped content schemas, optional form
  trees (tabs, groups, columns, field-ref chrome), and blocks. Shell-chrome
  plugins that replace the form shell are out of the star.
- **Defaults vs custom widgets:** the product owns excellent stock building
  blocks and tidy default editing. Bad UX from a consumer’s clever custom
  widget is the consumer’s business.
- **Tidy** means visual calm, structural calm (one entry, one form, clear
  sections), and interaction calm (predictable draft / conflict behavior).
- **Blocks DX:** prefer a declare-time `defineBlock({ schema, render })` (or
  equivalent) that registers schema and production renderer together for
  humans; [ADR-0012](adr/0012-block-schema-and-production-renderers-stay-separate.md)
  remains the invariant (separate registries; no required per-block authoring
  preview). Facade is intended DX, not a supersession of 0012.
- **How we judge “best”:** the reference host demos (`@cms/astro-demo-simple` /
  `@cms/astro-demo` / `@cms/sveltekit-demo`) plus a small set of Kirby-like
  acceptance scenes (compose an entry, nested blocks, tidy sections). Payload
  is the config foil, not the UX bar.

**Delivery (locked in ADRs):** local-first authoring shell as a **dev-mode
route**; project content is the source of truth; client-side Svelte shell UI
over a serializable CMS protocol; Astro + filesystem first; real Astro page as
default preview; Git outside the protocol. Portable claim: backend-agnostic
authoring UI with host-compiled editor configuration.

**Anti-goals (product identity):**

- YAML/JSON blueprint config as the primary way to define fields;
- a Next/React admin as the shell;
- a CSS visual builder / repo-mapped cascade editor as the product;
- hosted git CMS or an always-on production CMS server as the identity;
- guaranteeing good UX for every custom widget a consumer ships.

## System shape

```text
Host project
  src/content.config.ts (Zod/Astro collections)
                    |
                    | content-proxy stamps
                    v
         stamped collection graph
                    |
        +-----------+------------------+
        |                              |
        v                              v
optional cms.config.ts            stamped CMS assemble
  defineAstroCms form trees         host + form models
  (+ cms.components.ts)                    |
        |                                  |
        v                                  v
virtual:@cms/config              Authoring UI (shell + form + SJSF)
  form model + live bindings              |
        |                                  |
        +-------------+--------------------+
                      |
                      | serializable CMS protocol
                      v
Host / write-back (descriptors from stamped collections)
```

Responsibilities map to `@cms/authoring`, `@cms/core`, and `@cms/astro`
([ADR-0018](adr/0018-three-packages-for-adr-0008-layers.md)).

## Durable decisions

Thematic index only — open the ADR for rationale. Superseded ADRs stay in
`docs/adr/` for history; do not treat them as live.

### Product and module boundaries

- [ADR-0008](adr/0008-backend-agnostic-ui-fs-first-adapter.md)
- [ADR-0018](adr/0018-three-packages-for-adr-0008-layers.md)
- [ADR-0026](adr/0026-product-name-dev-cms.md)
- [ADR-0016](adr/0016-astro-convention-install-surface.md)

### Fields and schema projections

- [ADR-0025](adr/0025-schema-first-content-config-optional-overlay.md)
- [ADR-0024](adr/0024-content-field-stamps-live-in-core.md)
- [ADR-0023](adr/0023-semantic-projection-peers-stay.md)
- [ADR-0004](adr/0004-live-content-config-discovery.md)
- [ADR-0010](adr/0010-persisted-input-with-environment-schema-projections.md)

### Form shell, blocks, and preview

- [ADR-0011](adr/0011-sjsf-internal-one-form-recursive-layout.md)
- [ADR-0012](adr/0012-block-schema-and-production-renderers-stay-separate.md)
- [ADR-0013](adr/0013-real-astro-page-is-the-default-preview.md)

### CMS protocol and filesystem write-back

- [ADR-0005](adr/0005-write-back-contract.md)
- [ADR-0017](adr/0017-json-only-entry-serialization-v1.md)
- [ADR-0007](adr/0007-entry-id-path-conventions.md)
- [ADR-0014](adr/0014-working-tree-is-the-local-draft.md)
- [ADR-0021](adr/0021-draft-eligibility-stays-on-session-open.md)
- [ADR-0015](adr/0015-store-original-assets-astro-optimizes.md)

## Open threads

Ordering and deferred fog: [wayfinder map #1](https://github.com/bbtgnn/dev-cms/issues/1).
An open thread records a question, not an implementation contract; its Answer
stays unset until resolved.

## Technical references

- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro content API](https://docs.astro.build/en/reference/modules/astro-content/)
- [Astro integration API](https://docs.astro.build/en/reference/integrations-reference/)
- [SJSF custom components](https://x0k.github.io/svelte-jsonschema-form/guides/custom-components/)
- [SJSF UI schema](https://x0k.github.io/svelte-jsonschema-form/form/ui-schema/)
- [Vite plugin conventions](https://vite.dev/guide/api-plugin)
