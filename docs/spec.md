# Astro Dev CMS — architecture index

Status: navigation document

This document is the compact entry point for Astro Dev CMS architecture. It is
not an ADR, backlog, open-thread answer, or implementation spec. Durable
decisions live in ADRs; unresolved product questions and implementation work
live in GitHub Issues.

## Product direction

**North star:** the best **code-extensible building blocks** for a **tidy**
content editing experience over Astro content collections.

Steal Kirby’s panel *feel* (composable, calm) and Payload’s *config-in-code*
habit; reject Kirby’s YAML blueprints and Payload’s Next-shaped admin clunk.
The job is a local-first **authoring shell**, not a production CMS identity.

- **Building blocks (v1 surface):** Zod + FieldUi / direct Svelte widgets,
  recursive layouts (tabs, groups, grids), and blocks. Shell-chrome plugins
  that replace the form shell are out of the star.
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
- **How we judge “best”:** the reference host (`@cms/astro-template`) plus a
  small set of Kirby-like acceptance scenes (compose an entry, nested blocks,
  tidy sections). Payload is the config foil, not the UX bar.

Delivery and architecture (unchanged):

- main delivery is a **dev-mode route** inside a consumer Astro project;
- project content remains the source of truth;
- the shell UI is a client-side Svelte application;
- SJSF powers schema-driven forms;
- editor configuration and direct Svelte components compile through the host
  Vite graph;
- the shell UI exchanges serializable persisted input through a CMS protocol;
- Astro is the first host and the filesystem is the first write-back
  implementation;
- integration is intended for local development (dev-only by default);
- the real Astro page is the default preview;
- Git remains outside the CMS protocol.

The portable claim is a backend-agnostic authoring UI with host-compiled editor
configuration.

**Anti-goals (product identity):**

- YAML/JSON blueprint config as the primary way to define fields;
- a Next/React admin as the shell;
- a CSS visual builder / repo-mapped cascade editor as the product;
- hosted git CMS or an always-on production CMS server as the identity;
- guaranteeing good UX for every custom widget a consumer ships.

## Source hierarchy

When sources disagree, use this order:

1. Accepted [ADRs](adr/).
2. The current GitHub issue and its resolved Answer.
3. This architecture index.
4. Agent instructions and temporary handoffs.

Changing an accepted decision requires a new ADR that explicitly supersedes
the old one. Implementation issues must link to the decisions they realize
rather than copying those decisions into a second source of truth.

## System shape

```text
Host project
  browser-safe editor config
  Zod + FieldUi + layouts + direct Svelte components
                    |
                    | Vite module graph
                    v
Authoring UI
  shell UI + form shell + SJSF + authoring session
                    |
                    | serializable CMS protocol
                    v
Host / write-back implementations
  Astro mount + transport + server registry
  filesystem discovery + validation + atomic write-back + original assets
```

The conceptual modules are:

- runtime-neutral semantic model and layout declarations;
- CMS protocol, outcomes, and client;
- Svelte/SJSF form shell;
- reusable authoring application;
- Astro dev integration;
- filesystem write-back implementation.

These are responsibilities realized by `@cms/authoring`, `@cms/core`, and
`@cms/astro` ([ADR-0018](adr/0018-three-packages-for-adr-0008-layers.md)).

## Durable decisions

### Product and module boundaries

- [ADR-0008](adr/0008-backend-agnostic-ui-fs-first-adapter.md) — backend-agnostic
  authoring UI; filesystem first.
- [ADR-0018](adr/0018-three-packages-for-adr-0008-layers.md) — three packages for
  those layers (`authoring`, `core`, `astro` + reference host).
- [ADR-0009](adr/0009-conceptual-layers-before-package-extraction.md) —
  superseded by ADR-0018 (historical “stabilize before extract” guidance).
- [ADR-0016](adr/0016-astro-convention-install-surface.md) — convention-first
  Astro install (`cms()`, `cms.config` + `content.config` + `src/content/`).

### Fields and schema projections

- [ADR-0003](adr/0003-field-ui-on-zod-meta.md) — FieldUi rides on Zod metadata;
  direct components use the host Vite graph.
- [ADR-0004](adr/0004-live-content-config-discovery.md) — server/FS discovery and
  browser editor configuration are separate module-graph edges.
- [ADR-0010](adr/0010-persisted-input-with-environment-schema-projections.md) —
  editor, authoritative validator, and Astro are projections of one
  persisted-input model.

### Form shell, blocks, and preview

- [ADR-0011](adr/0011-sjsf-internal-one-form-recursive-layout.md) — SJSF stays
  internal; tabs, groups, and blocks share one form and a recursive layout.
- [ADR-0012](adr/0012-block-schema-and-production-renderers-stay-separate.md) —
  block schemas and production renderer bindings remain separate.
- [ADR-0013](adr/0013-real-astro-page-is-the-default-preview.md) — persisted
  content on the real Astro route is the default preview.

### CMS protocol and filesystem write-back

- [ADR-0005](adr/0005-write-back-contract.md) — the CMS protocol is the
  write-back seam; `/_cms` is an Astro transport.
- [ADR-0017](adr/0017-json-only-entry-serialization-v1.md) — JSON-only
  serialization in the v1 filesystem implementation (supersedes ADR-0006).
- [ADR-0007](adr/0007-entry-id-path-conventions.md) — filesystem entry IDs,
  paths, discovery fallback, and allowlisting.
- [ADR-0014](adr/0014-working-tree-is-the-local-draft.md) — valid changes write
  to the working tree with atomic, revision-guarded write-back.
- [ADR-0015](adr/0015-store-original-assets-astro-optimizes.md) — authoring stores
  original assets; Astro optimizes images at render (no Sharp upload pipeline).

ADR-0001 and ADR-0002 are retained as superseded history.

## Open threads

The [wayfinder map](https://github.com/bbtgnn/astro-dev-cms-gui/issues/1) owns
ordering and deferred fog.

Active design questions:

- [#2 — end-user form UI composition](https://github.com/bbtgnn/astro-dev-cms-gui/issues/2)
- [#6 — semantic schema and projection contract](https://github.com/bbtgnn/astro-dev-cms-gui/issues/6)
- [#7 — custom field and SJSF binding contract](https://github.com/bbtgnn/astro-dev-cms-gui/issues/7)
- [#8 — recursive form layout contract](https://github.com/bbtgnn/astro-dev-cms-gui/issues/8)
- [#9 — preview surface and unsaved draft transport](https://github.com/bbtgnn/astro-dev-cms-gui/issues/9)
- [#10 — invalid browser-state recovery](https://github.com/bbtgnn/astro-dev-cms-gui/issues/10)

Other deferred product questions:

- [#3 — shell commands seam](https://github.com/bbtgnn/astro-dev-cms-gui/issues/3)
- [#4 — schema builder UI](https://github.com/bbtgnn/astro-dev-cms-gui/issues/4)

An open thread records a question, not an implementation contract. Its Answer
is unset until the decision is explicitly resolved.

## Implementation planning

[#5 — Extract backend-agnostic authoring UI behind CMS protocol](https://github.com/bbtgnn/astro-dev-cms-gui/issues/5)
captures the cross-cutting migration spec. It remains intact for later ticket
splitting.

Implementation tickets should be small, reviewable slices with external
behavior, acceptance criteria, tests, dependencies, and explicit out-of-scope
work. Migration phases and open gaps belong there, not in this index.

## Technical references

- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro content API](https://docs.astro.build/en/reference/modules/astro-content/)
- [Astro integration API](https://docs.astro.build/en/reference/integrations-reference/)
- [SJSF custom components](https://x0k.github.io/svelte-jsonschema-form/guides/custom-components/)
- [SJSF UI schema](https://x0k.github.io/svelte-jsonschema-form/form/ui-schema/)
- [Vite plugin conventions](https://vite.dev/guide/api-plugin)
