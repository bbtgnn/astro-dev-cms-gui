# Astro Dev CMS — agent notes

Prototype monorepo toward a **backend-agnostic authoring UI** over Astro content
collections. Editor config (Zod + FieldUi + direct Svelte components) compiles through
the host Vite graph; the backend speaks a serializable CMS protocol. Filesystem is the
first adapter, not the product identity. Not a hosted git CMS control plane.

## Before exploring

- **Domain language** — always: [CONTEXT.md](CONTEXT.md). Prefer glossary terms; avoid listed synonyms.
- **Architecture** — schema projections, virtual config, layouts, persistence: [docs/spec.md](docs/spec.md). Layering: [ADR-0008](docs/adr/0008-backend-agnostic-ui-fs-first-adapter.md), [ADR-0009](docs/adr/0009-conceptual-layers-before-package-extraction.md).
- **Map / open threads** — GitHub [#1](https://github.com/bbtgnn/astro-dev-cms-gui/issues/1) (`wayfinder:map`). Decisions: [`docs/adr/`](docs/adr/).

## Locked invariants

- **Layers:** Authoring UI ↔ CMS protocol ↔ host/adapters (ADR-0008). UI must not import Astro/Node/FS/Sharp/Git.
- **Protocol:** entry identities + serializable `data` (Zod input); no client filesystem paths (ADR-0005).
- **FS adapter (v1):** YAML round-trip, id/path rules, live `content.config` discovery on the server (ADR-0004, 0006, 0007).
- **FieldUi:** on Zod `.meta()`; components via Vite config, not the protocol (ADR-0003).
- **Packages:** current `@cms/*` graph is approximate; do not explode or relock extraction yet (ADR-0009).
- **Self-host proof:** `@cms/astro-template` on Bun — `bun run dev` → site `:4321`, shell `/cms`, API `/_cms`.
- **Checks:** `bun run check && bun run check:allowlist && bun run lint`.

## Out of scope (v1)

Hosted git-auth CMS products, always-on CMS server as the default, desktop packaging,
MD/MDX body serialization (YAML `data` only in the FS adapter for now). Remote *protocol*
backends are allowed later; they are not the v1 deliverable.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `bbtgnn/astro-dev-cms-gui` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Defaults: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
