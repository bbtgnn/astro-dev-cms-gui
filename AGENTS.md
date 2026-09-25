# Dev CMS — agent notes

**Host-agnostic authoring shell** for file-backed content collections, delivered
mainly as a **dev-mode route** inside the host app. Optional overlay (form tree +
direct Svelte components) compiles through the host Vite graph; the host speaks a
serializable CMS protocol. Filesystem is the first write-back path, not the
product identity. Astro is the first host; not a hosted git CMS control plane.

## Before exploring

- **Domain language** — always: [CONTEXT.md](CONTEXT.md). Prefer glossary terms; avoid listed synonyms.
- **Architecture index** — navigate decisions and open threads from [docs/spec.md](docs/spec.md). The index is not an implementation spec.
- **Graph** — callers, call chains, symbols, impact, package shape: use [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp); follow the installed `codebase-memory` skill.
- **Authority** — accepted ADRs first, then the current issue and resolved Answer, then the architecture index. Temporary handoffs are never authoritative. Supersede an ADR explicitly; do not override one inside an implementation issue.
- **Map / open threads** — GitHub [#1](https://github.com/bbtgnn/dev-cms/issues/1) (`wayfinder:map`). Decisions: [`docs/adr/`](docs/adr/).

## Locked invariants

- **Layers:** Authoring UI ↔ CMS protocol ↔ host/adapters (ADR-0008). UI must not import Astro/Node/FS/Sharp/Git.
- **Protocol:** entry identities + serializable `data` (Zod input); no client filesystem paths (ADR-0005).
- **FS adapter (v1):** JSON round-trip, id/path rules; default host builds collection descriptors from stamped `content.config` (+ optional form trees) (ADR-0004, 0017, 0007, 0024, 0025).
- **Schema / overlay:** user-authored `content.config` is validation + location authority; optional `defineAstroCms` form tree + Vite components catalog. No generate of `content.config`; no Zod FieldUi dual path (ADR-0025, 0024; supersedes ADR-0019 / 0020 / 0003).
- **Schemas:** editor, authoritative validation, and Astro are projections of one persisted-input model (stamped schema authority); never write transformed Astro output (ADR-0010, 0025).
- **Form shell:** SJSF stays internal; recursive layouts, tabs, groups, and blocks remain in one form without changing persisted shape (ADR-0011).
- **Blocks / preview:** block schemas stay separate from production renderers; the real Astro page is the default preview (ADR-0012, 0013). Revive blocks/i18n as stamp/form-tree kinds ([#29](https://github.com/bbtgnn/dev-cms/issues/29)), not Zod FieldUi.
- **Local draft:** valid changes write atomically to the working tree with revision guards; invalid browser state does not replace canonical content (ADR-0014).
- **Packages:** `@cms/authoring` ↔ `@cms/core` ↔ `@cms/astro` (+ `demos/` reference hosts) — ADR-0018. UI must not import the `@cms/core` root or `@cms/astro`.
- **Install surface:** convention-first `cms()` — required `src/content.config.ts`, optional overlay / components, content under `src/content/` (ADR-0016, 0025).
- **Reference host:** `demos/astro-simple` (`@cms/astro-demo-simple`, default `bun run dev` → `:4321`), `demos/astro-overlay` (`@cms/astro-demo`, `bun run dev:overlay` → `:4322`), and `demos/sveltekit` (`@cms/sveltekit-demo`, `bun run dev:kit` → `:4323`, no `@cms/astro`); shell `/cms`, API `/cms/api`. Libraries stay under `packages/`.
- **Product name:** **Dev CMS** (`dev-cms` slug); npm packages stay `@cms/*` (ADR-0026).
- **Checks:** `bun run check && bun run check:allowlist && bun run lint`.
- **Svelte files:** kebab-case (`authoring-app.svelte`); SvelteKit route files (`+page.svelte`) unchanged.

## Where work belongs

- Durable architectural choice and rationale → `docs/adr/`.
- Unresolved design question → GitHub issue with `wayfinder:grilling`; keep `Answer` unset until resolved.
- Implementable behavior → a small GitHub issue with acceptance criteria, tests, dependencies, and `ready-for-agent` only when complete.
- Navigation and system summary → `docs/spec.md` and map issue #1.
- Session state not captured elsewhere → temporary handoff only; link to durable artifacts rather than duplicating them.

Do not put roadmaps, gap inventories, or feature requirements in agent instructions.

## Out of scope (v1)

Hosted git-auth CMS products, always-on CMS server as the default, desktop packaging,
MD/MDX body serialization (JSON `data` only in the FS adapter for now). Remote *protocol*
backends are allowed later; they are not the v1 deliverable.

## Agent skills

### Issue tracker

GitHub Issues via `gh` (create/list/claim/resolve, wayfinding map+children). See [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

### Triage labels

Role → label map for triage skills. See [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).

### Domain docs

How skills consume `CONTEXT.md` + ADRs. See [`docs/agents/domain.md`](docs/agents/domain.md).
