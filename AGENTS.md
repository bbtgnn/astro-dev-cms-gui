# Dev CMS — agents

How agents behave in this repo: what to open, how to edit, where work goes.

## Reach

- **Language** — always: [CONTEXT.md](CONTEXT.md). Prefer glossary terms; avoid listed synonyms.
- **Explore** — general code navigation (structure, symbols, callers, impact, package shape): [codebase-memory](https://github.com/DeusData/codebase-memory-mcp) first; follow the installed `codebase-memory` skill.
- **Decisions / threads** — [docs/spec.md](docs/spec.md) (architecture index, not an implementation spec), [`docs/adr/`](docs/adr/), map [#1](https://github.com/bbtgnn/dev-cms/issues/1) (`wayfinder:map`).
- **Authority** — accepted ADRs first, then the current issue and resolved Answer, then the architecture index. Temporary handoffs are never authoritative. Supersede an ADR explicitly; do not override one inside an implementation issue.

## When coding

- **Imports** — authoring UI must not import Astro, Node, FS, Sharp, or Git; UI must not import the `@cms/core` root or `@cms/astro` (ADR-0008, ADR-0018). Enforced by `check:layers`.
- **Svelte files** — kebab-case (`authoring-app.svelte`); SvelteKit route files (`+page.svelte`) unchanged.
- **Comments** — only for _why_ (a non-obvious constraint, tradeoff, or invariant the code cannot say).

## Place work

- Durable architectural choice and rationale → `docs/adr/`.
- Unresolved design question → GitHub issue with `wayfinder:grilling`; keep `Answer` unset until resolved.
- Implementable behavior → a small GitHub issue with acceptance criteria, tests, dependencies, and `ready-for-agent` only when complete.
- Navigation and system summary → `docs/spec.md` and map issue #1.
- Session state not captured elsewhere → temporary handoff only; link to durable artifacts rather than duplicating them.

Do not put roadmaps, gap inventories, or feature requirements in agent instructions.

## Skills

- **Issues / map / claim** — GitHub via `gh`: [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).
- **Labels / triage** — role → label map: [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).
- **Grill / domain-modeling** — how those skills consume CONTEXT + ADRs: [`docs/agents/domain.md`](docs/agents/domain.md).
