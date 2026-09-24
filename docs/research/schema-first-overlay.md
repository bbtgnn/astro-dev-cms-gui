# Schema-first + CMS overlay — design exploration

**Date:** 2026-09-23  
**Status:** exploration **accepted** — product law is
[ADR-0025](../adr/0025-schema-first-content-config-optional-overlay.md). This
note remains design history from branch `explore/schema-first-overlay`.  
**Question:** Soften CMS lock-in by making the user’s Standard Schema the validation authority, projecting JSON Schema for forms, and putting presentation chrome in an optional `defineCms` overlay — without losing image/ref semantics or portable (non-Astro) hosts.  
**Method:** Design grilling in-session; grounded in current ADRs + the sibling `astro-decap-github-connect` stamp/proxy tricks + Fattura second-host stance.  
**Honesty bar:** Exploration tree, not a decision. Recommendations below are locked *for this spike*, not product law.

---

## Problem with the current bet

ADR-0019 makes a **CMS unified tree** the human source and generates Astro `content.config.ts`. That buys one algebra and recoverable image/ref kinds, but forces users into a product schema language.

Sources: [ADR-0019](../adr/0019-cms-first-semantic-schema.md), [ADR-0020](../adr/0020-ir-form-model-only-editor-configuration.md), [ADR-0010](../adr/0010-persisted-input-with-environment-schema-projections.md).

---

## Sharper target (agreed direction for this spike)

| Layer | Authority |
| --- | --- |
| Host validation + (Astro) inference | User’s native schema **as-is** (Standard Schema **Input**) |
| Authoring semantics beyond Input | Explicit CMS overlay + host stamps — not inferred from JSON Schema alone |
| Browser form | Projection (JSON Schema + ui); JSON Schema is a **wire / form-shell** artifact, not the public integration seam |

Astro **Output** (image metadata, resolved refs) stays a render concern. CMS protocol carries persisted **Input** (paths, entry ids). Matches the spirit of ADR-0010.

Do **not** treat “any schema → JSON Schema → form” as the whole product story. That is lossy for CMS-hard fields.

---

## Locked answers (this exploration)

Provisional API names only — not final.

### Integration ladder

1. **Simple:** provide schemas (+ host knows where files live) → stamp/derive kinds → default form from JSON Schema projection.  
2. **Custom:** same schemas + `defineCms`-style overlay (singleton, layout, field editors, nested field chrome).

`defineCms` is **optional**. Missing overlay ⇒ stock editors by kind + flat object layout.

### User-facing schema (Astro flagship)

- v1 Astro path: user keeps authoring **Astro `content.config` / collection schemas** (Zod + `image()` / `reference()` / loaders).  
- **Standard Schema** is the **internal** port shape, not a third place users must put schemas.  
- **No generated `content.config` as default** (generation was the cost of CMS-first IR).

### Image / ref semantics (Q2)

Input alone is often `string`. Kind is recovered from the **schema graph**, reusing astro-decap-style tricks:

1. **Boot stamp / content proxy** — wrap live `image()` / `reference()` with meta before projection.  
2. **Structural detect** — e.g. Astro image object `{ src, width, height, format }` after `toJSONSchema` (heuristic; stamp-first is stronger).  
3. **Explicit meta** — ambiguous `z.string()` images still need an opt-in mark.

Reference sibling: `astro-decap-github-connect` (`image-bridge`, `stamp-helpers`, emit `toJSONSchema` + widget inference). That repo’s CONTEXT calls this an **Astro content proxy** / **image bridge**, not a public dual schema.

**Stamps are still a CMS overlay** — injected at load, not a second user-authored IR algebra. Prefer stamp/proxy over inventing kinds from Input JSON Schema alone.

### `defineCms` shape (unified Astro + non-Astro)

```ts
// Names provisional
defineCms<Collections extends Record<string, Schema>>(
  collections,
  config: CmsConfig<Collections>,
)
```

- **Multi-collection registry**, not one schema.  
- Same function for Astro and non-Astro (Fattura-style hosts).  
- Config typed from `Collections`; field chrome uses **nested scoping** (root sees top-level keys; inside an object, only that object’s keys). Compiles to persisted-input paths internally.  
- **Sugar that defines Astro collections + CMS in one call** deferred (CMS-first gravity well).

**Astro composition:** shared schema module imported by both `content.config` and `defineCms` — dual *registration*, single *schema authority*. Not live discovery of schemas *from* `content.config` as the typing source.

### Validation

- Light **client** JSON Schema (Ajv / SJSF) for UX.  
- **Authoritative** server = live schema Input parse.  
- Dual engines accepted; do not chase Ajv ≡ Zod.

### Form model delivery

- **v1:** host-compiled Vite virtuals for form model + components (ADR-0008). Protocol stays entries/assets/capabilities.  
- **Later option:** protocol “get form model” for non-Vite / remote hosts — useful second path, not default.

### Custom editors

- Still catalog keys + Vite-only live Svelte (`cms.components` style).  
- No components on the protocol.  
- No full FieldUi-on-Zod `.meta` (avoid resurrecting ADR-0003 as the primary chrome API).  
- Zod/Astro `.meta` (or stamps) only for recovering **Astro-native kinds** (`image` / `reference`), not layout/singleton/bindings.

### Package split (presentation vs Astro helpers)

- `defineCms` + schema→form projection ports → **`@cms/core`** (both hosts).  
- Content-config load + `image`/`reference` stamps → **`@cms/astro`**.  
- Fattura: `@cms/core` + `@cms/authoring` + app-data Writer; skip `@cms/astro` (existing second-host stance: map notes / #32–#34 — cited as context only; this spike does not edit the map).

### Product identity (spike stance)

- **Portable core + authoring; Astro is the first-class adapter**, not the only schema source.  
- Astro remains the flagship install surface.  
- Schema-first only for now; do not design dual defaults (CMS-first generate-Astro as equal mode). Revisit generation only if adoption pain demands it.

### What would eventually die / change (if this ships)

- CMS-first unified tree as **required** human source.  
- Generated `content.config` as **default**.  
- Closed semantic algebra as the **user-facing** authoring language.  

Keep a **thin internal** form projection IR if useful — not a user-authored algebra. Superseding ADR-0019 would require an explicit ADR later; this note does not do that.

### Process constraints for this spike

- Capture on branch only.  
- **Do not** change GitHub map issue #1 while this is exploration.  
- Temporary handoffs / research notes are not authority (AGENTS.md).  
- **Local tracker (plan + tickets):** [`docs/research/schema-first-overlay/`](./schema-first-overlay/) — [map.md](./schema-first-overlay/map.md), [plan.md](./schema-first-overlay/plan.md), `issues/`.

---

## Loaders, paths, and layer split

CMS config is mostly **UI / presentation**. Loader / glob / folder is mostly a **Writer / persistence** concern.

### Hard package layers (spike stance)

| Concern | Owns | Does not own |
| --- | --- | --- |
| **Schema record** | Persisted Input shape + validation | Where files live; widgets |
| **Editor config** (`defineCms` 2nd arg) | Singleton UX, layout, field editors, nested chrome | Loaders, folders, Writer I/O |
| **Collection location** | How to list/resolve entry ids → storage keys (glob base, file path, app-data keyspace) | Form widgets |
| **Writer** | Bytes / records I/O | Schema algebra |
| **Host join** | Build protocol collection descriptors = name + schema + location | —

### Astro (locked for spike direction)

Safe to leave loaders/paths where **Astro already requires them** (`content.config` / `defineCollection`).

**Open research (this branch):** better extraction of loader/base/path metadata from that graph — possibly Astro/Vite hooks, or importing `content.config` into CMS config so the registry is `Record<string, ReturnType<typeof defineCollection>>` and the integration can hook inside that object. Do not assume today’s content-proxy/stamp approach is final.

### Non-Astro (locked for spike direction)

**Host-only location** beside `defineCms(collections, overlay)` — see [ticket 10](./schema-first-overlay/issues/10-stub-non-astro-location-api.md). Do not force glob-shaped location onto the portable editor face.

### Singleton (locked)

**Editor-only flag** (shell UX: hide id, single-entry flows). Astro Content Layer does not support singletons as a first-class collection mode today; location for “one file” remains a host/Writer concern if needed, separate from the editor flag.

### Id ↔ path mapping (clarification; not locked)

In this repo today, the FS adapter treats protocol `id` as opaque to the UI, but maps it to a file path under the loader base (e.g. `docs/intro` ↔ `<base>/docs/intro.json`) — [ADR-0007](../adr/0007-entry-id-path-conventions.md). “Id rules” meant that mapping / allowPaths / pathTemplate behavior on the **host/Writer**, not something authors set in editor chrome.

**Spike default unless challenged:** leave id↔path on the host/adapter; `defineCms` does not configure it.

### Branch research phase (open thread)

1. **Astro loader/path extraction** — done → [`astro-loader-extraction.md`](./astro-loader-extraction.md). Verdict: public `Loader` has no `base`/`pattern`; prefer host-side content-proxy stamps (zod-decap style) + explicit location escape; no official Astro list-loaders API.  
2. Best **non-Astro** API for schema + location — done → [`schema-first-overlay/issues/10-stub-non-astro-location-api.md`](./schema-first-overlay/issues/10-stub-non-astro-location-api.md). Verdict: host-only join via `createCmsHost` descriptors; optional later `cmsCollection({ schema, location })` sugar; not required for demos 06/07.  
3. Confirm host-only id↔path (ADR-0007) stays out of editor config — default unless challenged.

---

## Comparable prior art (this repo + sibling)

| Piece | Where | Relevance |
| --- | --- | --- |
| CMS-first IR → form + validator + generated Astro | ADR-0019 / `@cms/core` semantic | What this spike would demote from *user* authority |
| Layers UI ↔ protocol ↔ host | ADR-0008, ADR-0018 | Keep; change schema authority, not layering |
| Zod `.meta` FieldUi (removed) | ADR-0003 superseded | Do not revive as primary chrome |
| Decap stamp / image bridge / loader stamp | `astro-decap-github-connect` | Kind recovery + loader metadata patterns |
| Fattura second host | External consumer research; CMS #32–#34 | Proves non-Astro must not require `@cms/astro` schema stamps |

---

## Out of scope for this note

- Implementing the flip.  
- Editing map issue #1.  
- Final public API names.  
- MD/MDX body serialization, hosted git CMS, always-on CMS server (product out of scope / v1 limits unchanged).

---

## Execution decisions (2026-09-23)

Locked for implementation on this branch (still not map/ADR law):

| ID | Decision |
| --- | --- |
| Q19 | Demos + `cms()` happy path may violate ADR-0019 on this branch; no map edit; research notes state exploration-only. |
| Q20 | Two workspace packages: `@cms/astro-demo-simple` + `@cms/astro-demo`. |
| Q21 | Simple demo: `cms()` with **no** `cms.config` → stock forms from stamped collections. |
| Q22 | **Full happy-path flip** — kill generation in product `cms()`; no phased dual path. Breakage OK on this branch. |
| Q23 | Rename packages + update root scripts; light CONTEXT/AGENTS so agents find demos; full glossary polish later with ADR. |

---

## Next grilling frontier

1. Confirm host-only id↔path (ADR-0007) stays out of editor config — default unless challenged (parent item 3).  
2. Optional: spike experiments listed in [`astro-loader-extraction.md`](./astro-loader-extraction.md) (boot order, dual load, `file()` UX) when ready to prototype — not required to close the design tree.
