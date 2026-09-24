# 10 — Stub: non-Astro schema + location API

Type: research  
Status: resolved  
Blocked by: [01](./01-research-done.md)

## Goal

Capture the follow-up API sketch for Fattura-style hosts so the Astro flip does not pretend globs are universal. **No implementation required** to complete the Astro happy-path plan.

## Question

What should non-Astro hosts pass for location beside `defineCms(collections, overlay)` — overload, sibling helper, or host-only `createCmsHost` options?

## Acceptance

- [x] Short research note or Answer section below with recommended shape
- [x] Explicit: not required for demos 06/07
- [x] Link from parent [schema-first-overlay.md](../../schema-first-overlay.md) research phase item 2

## Answer

**Exploration stub only — not product law. Not required for demos 06/07** (`@cms/astro-demo-simple` / `@cms/astro-demo`); Astro happy path already joins location from stamped loaders.

### Superseded for non-Astro helper face (ticket 15)

Phase plan + [ticket 15](./15-task-non-astro-definecms.md) put **location on** `cms.collection({ schema, location, form })` inside portable `defineCms` on `@cms/core`. That is the non-Astro authoring face; host still calls `createCmsHost({ collections: config.descriptors })`. The “host-only join / optional sugar later” stance below remains historical for the Astro flip stub — do not treat it as blocking 15.

### Recommended shape (stub era — Astro flip)

**Host-only join.** Keep `defineCms(collections, overlay)` as schema record + presentation chrome for both Astro and non-Astro. Pass **collection location** when building protocol descriptors for `createCmsHost` (name + schema + location → CMS protocol collections). Do not put location in the overlay (2nd arg).

- **Astro (shipped):** location from content-proxy loader stamps (`glob`/`file` base) + optional `locations` escape on the stamped host builder — [ADR-0007](../../../adr/0007-entry-id-path-conventions.md) id↔path stays on the host/Writer.
- **Non-Astro (Fattura-style):** host code supplies location beside schemas when calling `createCmsHost` / an equivalent descriptor builder. Today that is already the `CollectionDescriptor` face (`base`, optional `pathTemplate`). Later location may be a tagged union (e.g. FS base vs app-data keyspace) — still host-owned, never editor chrome.
- **Optional sugar (later):** a thin `@cms/core` sibling helper such as `cmsCollection({ schema, location })` that returns a descriptor-shaped value for the host join. Convenience only; not a second public product surface and not needed to close this spike. **→ Landed as `defineCms` / `cms.collection` in ticket 15.**

### Rejected for now

| Option | Why not (spike stance) |
| --- | --- |
| Location in `defineCms` overlay | Overlay is presentation-only; loaders/folders are Writer/host concerns ([parent layer split](../../schema-first-overlay.md)). |
| Required `defineCms` overload `{ schema, location }` | Forces a dual first-arg shape onto the Astro path that already gets location from stamps; invites glob-shaped location onto the portable editor face. |

### Layers (unchanged)

Authoring UI ↔ CMS protocol ↔ host ([ADR-0008](../../../adr/0008-backend-agnostic-ui-fs-first-adapter.md)). Browser never sees paths; non-Astro hosts skip `@cms/astro` stamps and wire schema + location at host construction (via ticket 15 `defineCms` descriptors or equivalent).
