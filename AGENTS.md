# Astro Dev CMS — agent notes

**Backend-agnostic authoring UI** over Astro content collections, delivered mainly as a
**dev-mode route** inside an Astro project. Editor config (CMS unified tree + direct Svelte
components) compiles through the host Vite graph; the host speaks a serializable CMS
protocol. Filesystem is the first write-back path, not the product identity. Not a hosted
git CMS control plane.

## Before exploring

- **Domain language** — always: [CONTEXT.md](CONTEXT.md). Prefer glossary terms; avoid listed synonyms.
- **Architecture index** — navigate decisions and open threads from [docs/spec.md](docs/spec.md). The index is not an implementation spec.
- **Authority** — accepted ADRs first, then the current issue and resolved Answer, then the architecture index. Temporary handoffs are never authoritative. Supersede an ADR explicitly; do not override one inside an implementation issue.
- **Map / open threads** — GitHub [#1](https://github.com/bbtgnn/astro-dev-cms-gui/issues/1) (`wayfinder:map`). Decisions: [`docs/adr/`](docs/adr/).

## Locked invariants

- **Layers:** Authoring UI ↔ CMS protocol ↔ host/adapters (ADR-0008). UI must not import Astro/Node/FS/Sharp/Git.
- **Protocol:** entry identities + serializable `data` (Zod input); no client filesystem paths (ADR-0005).
- **FS adapter (v1):** JSON round-trip, id/path rules, live generated `content.config` discovery on the server (ADR-0004, 0017, 0007, 0019).
- **FieldUi / schema:** CMS-first unified tree in `cms.config.ts`; Astro `content.config.ts` is generated; components via Vite, not the protocol (ADR-0019; supersedes ADR-0003).
- **Schemas:** editor, authoritative validation, and Astro are projections of one persisted-input model (IR authority); never write transformed Astro output (ADR-0010, 0019).
- **Form shell:** SJSF stays internal; recursive layouts, tabs, groups, and blocks remain in one form without changing persisted shape (ADR-0011).
- **Blocks / preview:** block schemas stay separate from production renderers; the real Astro page is the default preview (ADR-0012, 0013).
- **Local draft:** valid changes write atomically to the working tree with revision guards; invalid browser state does not replace canonical content (ADR-0014).
- **Packages:** `@cms/authoring` ↔ `@cms/core` ↔ `@cms/astro` (+ `@cms/astro-template` reference host) — ADR-0018. UI must not import the `@cms/core` root or `@cms/astro`.
- **Install surface:** convention-first `cms()` — `src/cms.config.ts` + generated `src/content.config.ts` + `src/content/` (ADR-0016, 0019). Default host is built by `@cms/astro`.
- **Reference host:** `@cms/astro-template` on Bun — `bun run dev` → site `:4321`, shell `/cms`, API `/_cms` via `@cms/astro`.
- **Checks:** `bun run check && bun run check:allowlist && bun run lint`.

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

Issues live in GitHub Issues for `bbtgnn/astro-dev-cms-gui` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Defaults: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
