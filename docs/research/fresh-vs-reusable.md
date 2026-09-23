# Fresh vs reusable — Astro Dev CMS product surface

**Date:** 2026-09-22  
**Question:** What parts of this product are genuinely fresh/interesting, and what parts could reuse other libraries / packages?  
**Method:** Primary sources in-repo (CONTEXT, ADRs, package code) plus external comparable products and libraries. Claims below cite a source.  
**Honesty bar:** Prefer “composition / packaging / constraint-driven” over “invention” unless the combo is uncommon.

---

## Product identity (baseline)

Astro Dev CMS is a **backend-agnostic authoring UI** over Astro content collections, delivered mainly as a **dev-mode route** inside a consumer Astro project. Config is code (`cms.config.ts`); a closed semantic IR projects to form model + authoritative validation + generated Astro Zod; SJSF drives forms; the real Astro page is the default preview; filesystem write-back sits behind a CMS protocol. It is **not** a hosted git CMS control plane.

Sources: [CONTEXT.md](../../CONTEXT.md), [AGENTS.md](../../AGENTS.md), [docs/spec.md](../spec.md), [docs/adr/0008-backend-agnostic-ui-fs-first-adapter.md](../adr/0008-backend-agnostic-ui-fs-first-adapter.md).

Package map (ADR-0018):

| Package | Role |
| --- | --- |
| `@cms/authoring` | Shell UI, form shell, session / autosave |
| `@cms/core` | Semantic IR, CMS protocol, FS write-back |
| `@cms/astro` | `cms()` integration, Vite virtuals, `/_cms`, content.config generation |
| `@cms/astro-demo-simple` / `@cms/astro-demo` | Reference host demos (schema-first exploration) |

Sources: [docs/adr/0018-three-packages-for-adr-0008-layers.md](../adr/0018-three-packages-for-adr-0008-layers.md), package `package.json` files under `packages/`.

North-star foils (explicit, not invented here): Kirby’s panel *feel*, Payload’s *config-in-code* habit; reject Kirby YAML blueprints and Payload’s Next admin as identity.

Source: [docs/spec.md](../spec.md) (“Product direction”).

---

## Classification legend

| Bucket | Meaning |
| --- | --- |
| **Genuinely fresh / differentiated** | Architecture or UX bets competitors do not typically combine this way for Astro collections — even if each piece is known elsewhere |
| **Interesting but incremental** | Clever composition of known ideas; value is coherence and constraints, not novelty of the idea |
| **Commodity / lean on libs** | Should use (or already uses) existing packages; custom code here is mostly glue or product chrome |

---

## 1. Genuinely fresh / differentiated

These are the strongest “this is the product” bets. Several are **packaging of known patterns under Astro-specific constraints**, not green-field invention — called out honestly.

### 1.1 CMS-first IR → form model **and** generated native `content.config.ts`

Human source is one unified tree in `src/cms.config.ts`. Compile projects to:

1. browser form model (JSON Schema + layout / bindings),
2. component-free authoritative persisted-input validator,
3. **generated** native Astro `content.config.ts` (`image()`, `reference()`, loaders, `defineCollection()`).

Browser never imports `content.config`; Astro never imports live Svelte editors. Live components stay in `cms.components.ts` / Vite only.

Sources: [docs/adr/0019-cms-first-semantic-schema.md](../adr/0019-cms-first-semantic-schema.md), [docs/adr/0020-ir-form-model-only-editor-configuration.md](../adr/0020-ir-form-model-only-editor-configuration.md), [docs/adr/0010-persisted-input-with-environment-schema-projections.md](../adr/0010-persisted-input-with-environment-schema-projections.md), `packages/astro/src/generate/emit-content-config.ts`, `packages/core/src/semantic/`.

**Why this is differentiated vs Keystatic (closest Astro peer):** Keystatic uses `keystatic.config.ts` for the admin schema and still expects a **separately authored** Astro `content.config.ts` that mirrors collections/paths ([Astro Keystatic guide](https://docs.astro.build/en/guides/cms/keystatic/), [Keystatic configuration](https://keystatic.com/docs/configuration)). Dual-schema drift is the default Keystatic+Astro story; this product’s ADR-0019 bet is to **own the algebra and generate** Astro so persisted image paths / semantic kinds stay recoverable (ADR-0019 cites Astro `image()` / `z.input` limits).

**Freshness caveat:** “One schema language, many projections” is a standard compiler/CMS pattern (Payload config → DB + admin; Tina schema → GraphQL). The **Astro-native generation + IR authority because Astro typing cannot recover persisted image paths** is the differentiated constraint, not “we invented multi-target schemas.”

### 1.2 Host-compiled editor config + serializable CMS protocol (no components on the wire)

Layers (ADR-0008):

1. Authoring UI — no Astro / Node / FS / Sharp / Git  
2. CMS protocol — entry identities `{ collection, id }` + serializable `data`  
3. Host / adapters — Vite virtuals (`virtual:@cms/config`, `virtual:@cms/components`, …), FS adapter, `/_cms` transport  

Editor configuration and live Svelte widgets compile through the **host Vite graph**; the protocol carries only DTOs.

Sources: [docs/adr/0008-backend-agnostic-ui-fs-first-adapter.md](../adr/0008-backend-agnostic-ui-fs-first-adapter.md), [docs/adr/0005-write-back-contract.md](../adr/0005-write-back-contract.md), `packages/astro/src/vite-config-plugin.ts`, `packages/core/src/protocol.ts`.

**Freshness caveat:** Ports-and-adapters / hexagonal layering is not novel. Decap also separates UI from “backend” ([Decap config / backends](https://decapcms.org/docs/configuration-options/)). The sharper bet is **Vite-compiled direct Svelte widgets as first-class config**, with protocol never shipping UI — closer to Payload’s code components ([Payload config overview](https://github.com/payloadcms/payload/blob/main/docs/configuration/overview.mdx)) but aimed at a **dev-route, Astro-hosted, FS-first** shell rather than a Next admin + DB.

### 1.3 Working tree is the local draft; invalid browser state must not replace canonical files

Valid changes write atomically to project content; Git commit stays outside the protocol; writes carry opaque revisions (content hash); conflicts beat silent overwrite; invalid in-progress browser state must not break Astro load / real-page preview.

Sources: [docs/adr/0014-working-tree-is-the-local-draft.md](../adr/0014-working-tree-is-the-local-draft.md), `packages/core/src/revision.ts`, `packages/core/src/node-fs-writer.ts` (temp + rename), `packages/core/src/write-mode.ts`.

**Compared to peers:**

- Decap’s default identity is **commit-to-remote-git**; local FS is a bolted-on `local_backend` / proxy story ([Decap configuration options](https://decapcms.org/docs/configuration-options/), [Decap GitHub README](https://github.com/decaporg/decap-cms)).
- Tina local `tinacms dev` also writes the working tree ([Tina data layer](https://tina.io/docs/reference/content-api/data-layer)), but product gravity includes GraphQL index + Tina Cloud / editorial workflows — not “dev-route authoring shell whose draft *is* the working tree and Git is deliberately outside the protocol.”

**Freshness caveat:** Atomic write + optimistic concurrency are commodity techniques. The differentiated **product rule** is draft = working tree + never poison Astro with invalid browser state + Git not in the CMS protocol.

### 1.4 Real Astro page as default preview (no parallel block renderer required)

After validate → atomic write → Astro refresh, preview is the site’s real route/renderer. Block schemas stay separate from production renderers; no required per-block authoring preview.

Sources: [docs/adr/0013-real-astro-page-is-the-default-preview.md](../adr/0013-real-astro-page-is-the-default-preview.md), [docs/adr/0012-block-schema-and-production-renderers-stay-separate.md](../adr/0012-block-schema-and-production-renderers-stay-separate.md), [docs/adr/0015-store-original-assets-astro-optimizes.md](../adr/0015-store-original-assets-astro-optimizes.md).

**Freshness caveat:** “Preview the real site” is common for SSG/local CMSes. The combination with **persist-first preview**, **no Sharp at upload**, and **blocks without mandatory dual renderers** is a coherent Astro-native stance — not a unique invention of iframe preview.

### 1.5 Dev-mode route as product identity (not production CMS server)

Primary delivery is a local authoring shell; always-on production CMS / hosted git CMS are anti-goals for v1 identity.

Sources: [docs/adr/0001-local-fs-authoring-not-hosted-git-cms.md](../adr/0001-local-fs-authoring-not-hosted-git-cms.md) (superseded history), [docs/adr/0008-backend-agnostic-ui-fs-first-adapter.md](../adr/0008-backend-agnostic-ui-fs-first-adapter.md), [AGENTS.md](../../AGENTS.md) “Out of scope (v1)”, [docs/spec.md](../spec.md).

**Freshness caveat:** Positioning against Decap/Netlify-style hosted git CMS is a **market/product framing** choice. Keystatic also supports local storage and Astro integration ([Keystatic config](https://keystatic.com/docs/configuration)). Differentiation is the **IR→Astro generation + Svelte/SJSF + protocol layering**, not “we invented local editing.”

---

## 2. Interesting but incremental

Valuable product work; ideas exist elsewhere. Worth owning in-repo when they encode domain constraints; not “novel CS.”

| Surface | Why incremental | Sources |
| --- | --- | --- |
| Three packages aligned to UI / protocol / host | Classic layering; ADR-0018 collapses an earlier “don’t extract early” stance | [ADR-0018](../adr/0018-three-packages-for-adr-0008-layers.md), [ADR-0008](../adr/0008-backend-agnostic-ui-fs-first-adapter.md) |
| Convention-first `cms()` (`cms.config` + generated `content.config` + `src/content/`) | Same install ergonomics class as Keystatic’s `keystatic()` + config file; difference is generation of Astro schema | [ADR-0016](../adr/0016-astro-convention-install-surface.md), [ADR-0019](../adr/0019-cms-first-semantic-schema.md), `packages/astro/src/integration.ts` |
| Vite virtual modules for config / components / host | Standard Vite plugin pattern | [Vite plugin API](https://vite.dev/guide/api-plugin), `packages/astro/src/vite-config-plugin.ts`, [docs/spec.md](../spec.md) technical refs |
| Opaque binding tokens → host resolves live Svelte | Same problem class as Payload admin component import maps / Decap custom widgets | [ADR-0019](../adr/0019-cms-first-semantic-schema.md), Payload [configuration overview](https://github.com/payloadcms/payload/blob/main/docs/configuration/overview.mdx) |
| Semantic kinds → stock editors registry | Field-type → widget maps are universal (Decap widgets, Kirby field types, Payload field types) | `packages/authoring/src/form/stock-registry.ts`, [CONTEXT.md](../../CONTEXT.md) “Field registry” |
| Recursive layout (tabs / groups / columns) inside one form | Kirby blueprints already do tabs/columns/sections; ADR-0011 chooses SJSF + layout that does not change persisted shape | [ADR-0011](../adr/0011-sjsf-internal-one-form-recursive-layout.md), [Kirby blueprint layout](https://getkirby.com/docs/guide/blueprints/layout) |
| Authoring session (eligibility, revision chaining, remount rules, autosave seam) | Domain orchestration on top of protocol — necessary product code, not a new persistence model | [CONTEXT.md](../../CONTEXT.md) “Authoring session”, `packages/authoring/src/session.ts`, `packages/authoring/src/autosave.ts` |
| Block field as discriminated union in one SJSF form | Common CMS pattern (Payload blocks, Kirby blocks, Decap lists/objects) | [ADR-0012](../adr/0012-block-schema-and-production-renderers-stay-separate.md) |
| Entry id / path conventions + allowlisting | Every FS CMS invents path rules; ADR-0007 is product-specific convention, not a new category | [ADR-0007](../adr/0007-entry-id-path-conventions.md) |
| JSON-only entry serialization (v1) | Deliberate narrowing vs MD/MDX-heavy peers (Keystatic Markdoc, Decap Markdown) | [ADR-0017](../adr/0017-json-only-entry-serialization-v1.md), Keystatic [configuration](https://keystatic.com/docs/configuration) |
| “Steal Kirby feel + Payload config-in-code” | Spec admits this is composition of known foils | [docs/spec.md](../spec.md) |

---

## 3. Commodity / should lean on existing libraries

### 3.1 Already reused (keep / deepen)

| Concern | Library / package | Evidence |
| --- | --- | --- |
| Schema-driven forms | **SJSF** (`@sjsf/form`, `@sjsf/basic-theme`, `@sjsf/ajv8-validator`) | [ADR-0011](../adr/0011-sjsf-internal-one-form-recursive-layout.md), `packages/authoring/package.json`, `packages/authoring/src/form/CmsForm.svelte`, [SJSF custom components](https://x0k.github.io/svelte-jsonschema-form/guides/custom-components/) |
| Client JSON Schema validation | **Ajv 8** via `@sjsf/ajv8-validator` | `packages/authoring/src/form/sjsf-imports.ts`, `packages/authoring/src/form/ui-schema.ts` |
| Authoritative / projection Zod | **Zod** | `packages/core/package.json`, `packages/core/src/write-mode.ts`, [ADR-0010](../adr/0010-persisted-input-with-environment-schema-projections.md) |
| UI framework | **Svelte 5** (peer) | `packages/authoring/package.json`, host `@astrojs/svelte` |
| Astro host APIs | **Astro** content collections, integrations, Vite | [Astro content collections](https://docs.astro.build/en/guides/content-collections/), `packages/astro/src/integration.ts` |

SJSF is the Svelte-side cousin of the mature **RJSF** (react-jsonschema-form) schema + uiSchema model ([RJSF docs](https://rjsf-team.github.io/react-jsonschema-form/docs/), [RJSF uiSchema](https://rjsf-team.github.io/react-jsonschema-form/docs/api-reference/uiSchema)). The product correctly treats SJSF as an **internal** form engine, not the public FieldUi contract ([ADR-0011](../adr/0011-sjsf-internal-one-form-recursive-layout.md)).

### 3.2 Commodity areas — prefer libs / thin glue over custom frameworks

| Concern | Prefer / consider | Notes |
| --- | --- | --- |
| Form state, widgets, validation plumbing | Keep **SJSF**; do not reimplement form engines | Escape hatches stay advanced ([ADR-0011](../adr/0011-sjsf-internal-one-form-recursive-layout.md)); open threads [#7](https://github.com/bbtgnn/astro-dev-cms-gui/issues/7), [#8](https://github.com/bbtgnn/astro-dev-cms-gui/issues/8) should stay “bindings over SJSF,” not a second form library |
| JSON Schema / Ajv idiosyncrasies | Stay on SJSF’s Ajv path; strip presentation bags before validate (`stripUiFromJsonSchema`) | `packages/authoring/src/form/ui-schema.ts` |
| Shell chrome (nav, lists, dialogs, buttons) | **bits-ui / shadcn-svelte** (or similar) when chrome lands | `packages/authoring/src/components/shadcn/index.ts` is currently an empty socket — correct instinct |
| HTTP catch-all dispatcher / middleware | Keep thin Astro middleware; no custom HTTP framework | `packages/astro/src/http/`, [ADR-0005](../adr/0005-write-back-contract.md) (`/_cms` is transport) |
| Atomic FS write | Node `writeFile` + `rename` (already) or small helpers like `write-file-atomic` | `packages/core/src/node-fs-writer.ts`; ADR-0014 semantics matter more than the helper |
| Path allowlisting / traversal safety | Keep domain rules; could use hardened path helpers if needed | [ADR-0007](../adr/0007-entry-id-path-conventions.md), `packages/core/src/path-resolve.ts` |
| Content hashing for revisions | Node `crypto` (already) | `packages/core/src/revision.ts` |
| Image upload UI / file pickers | Browser File APIs + stock field; **no Sharp** at authoring | [ADR-0015](../adr/0015-store-original-assets-astro-optimizes.md); Astro image APIs at render ([Astro images / content](https://docs.astro.build/en/guides/content-collections/)) |
| Debounced autosave | Tiny local controller is fine; no need for a state library | `packages/authoring/src/autosave.ts` |
| Routing chrome for `/cms` | Astro `injectRoute` + one shell page | `packages/astro/src/shell-page.astro`, [ADR-0016](../adr/0016-astro-convention-install-surface.md) |
| In-memory protocol test double | Already custom + fine (`memoryWriter`) | [ADR-0005](../adr/0005-write-back-contract.md), `packages/core/src/memory-writer.ts` |

### 3.3 Do **not** treat as commodity to “just replace with Product X”

| Temptation | Why not (for this product) |
| --- | --- |
| Replace IR with hand-written Astro Zod + Decap YAML | Rejected product identity ([docs/spec.md](../spec.md), [ADR-0019](../adr/0019-cms-first-semantic-schema.md)); Decap is YAML + git backend ([Decap](https://decapcms.org/docs/configuration-options/)) |
| Adopt Payload / Tina as the shell | Payload is Next admin + DB ([Payload](https://github.com/payloadcms/payload/blob/main/docs/configuration/overview.mdx)); Tina centers GraphQL data layer ([Tina](https://tina.io/docs/reference/content-api/data-layer)) — different identity |
| Expose raw SJSF as the public schema API | Explicitly internal ([ADR-0011](../adr/0011-sjsf-internal-one-form-recursive-layout.md), [ADR-0020](../adr/0020-ir-form-model-only-editor-configuration.md)) |
| Reintroduce Zod `.meta()` FieldUi dual path | Superseded / deleted ([ADR-0003](../adr/0003-field-ui-on-zod-meta.md) superseded by 0019/0020) |

---

## 4. Competitor map (compressed)

| Product | Overlap | Clearest difference from this repo |
| --- | --- | --- |
| **Keystatic** | Local FS, TS config, Astro integration, content under `src/content` | Dual schema (Keystatic + Astro); React/Markdoc-shaped admin; GitHub/Cloud storage modes ([Keystatic](https://keystatic.com/docs/configuration), [Astro guide](https://docs.astro.build/en/guides/cms/keystatic/)) |
| **Decap (Netlify CMS)** | File-based content, collection/field UI, optional local backend | YAML `config.yml`, git-commit identity, React admin SPA ([Decap](https://github.com/decaporg/decap-cms)) |
| **TinaCMS** | Local file write in `tinacms dev`, TS schema | GraphQL data layer / index; Cloud-oriented production path ([Tina data layer](https://tina.io/docs/reference/content-api/data-layer)) |
| **Payload** | Config-in-code, code components in admin | DB-backed, Next admin, production CMS identity ([Payload](https://github.com/payloadcms/payload/blob/main/docs/configuration/overview.mdx)); used as *config foil* in [docs/spec.md](../spec.md) |
| **Kirby** | Calm composable panel; tabs/columns/fields | PHP app + YAML blueprints ([Kirby blueprints](https://getkirby.com/docs/guide/blueprints/introduction)); used as *UX foil* in [docs/spec.md](../spec.md) |

---

## 5. Strong disagreements with a naive “everything is novel” reading

1. **Local FS authoring for Astro is not a unique category.** Keystatic already owns much of that space; Decap/Tina cover file→Git or file→local with different packaging.
2. **“Backend-agnostic UI + protocol” is architecture hygiene**, not a moat. Most serious CMSes have a transport/backend seam.
3. **SJSF/RJSF-style schema forms are borrowed.** Owning a form engine would be a mistake; the product already says SJSF is internal.
4. **Kirby + Payload as inspirations are packaging**, openly stated in the architecture index — not discoveries.
5. **Vite virtual modules, atomic rename writes, content hashing, middleware dispatchers** are commodity infrastructure.
6. **The real differentiator is the constraint stack:** CMS-first IR that generates native Astro collections (because Astro typing cannot be the persisted-input authority) + host-compiled Svelte widgets + working-tree-as-draft with revision guards + real-page preview + deliberate *non*-git-CMS identity. That **stack** is interesting; most individual layers are not.
7. **JSON-only v1** is a temporary product narrowing ([ADR-0017](../adr/0017-json-only-entry-serialization-v1.md)), not a strength versus Markdoc/MDX-capable peers — treat as scope, not differentiation forever.
8. **Shell UX “tidiness” is aspirational and mostly unbuilt chrome** (shadcn socket empty; open threads on form composition / preview placement). Do not confuse architecture ADRs with shipped Kirby-like polish.

---

## 6. Practical reuse recommendations (for implementers)

1. **Double down on SJSF** for form mechanics; invest product time in IR → form-model lowering, stock kinds, and layout — not widgets/`createForm` clones.
2. **Keep IR + content.config generation** as first-party code; that is the Astro-specific wedge vs Keystatic dual-schema.
3. **Keep CMS protocol + revision/conflict semantics** first-party; thin over Node FS / fetch.
4. **Buy shell chrome** (buttons, dialogs, lists) from the Svelte ecosystem when building UI.
5. **Do not absorb Tina GraphQL, Payload admin, or Decap YAML** as foundations — they fight the locked invariants in [AGENTS.md](../../AGENTS.md).
6. When comparing to Keystatic in docs/marketing, claim **generated Astro schema + Svelte/SJSF + protocol layering + draft=working-tree rules**, not “local CMS for Astro” alone.

---

## 7. Source index

### In-repo

- [CONTEXT.md](../../CONTEXT.md)
- [AGENTS.md](../../AGENTS.md)
- [docs/spec.md](../spec.md)
- ADRs: 0001, 0005, 0007, 0008, 0010, 0011, 0012, 0013, 0014, 0015, 0016, 0017, 0018, 0019, 0020 under [docs/adr/](../adr/)
- Packages: `packages/authoring`, `packages/core`, `packages/astro`, `packages/astro-demo-simple`, `packages/astro-demo`

### External

- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro + Keystatic](https://docs.astro.build/en/guides/cms/keystatic/)
- [Keystatic configuration](https://keystatic.com/docs/configuration)
- [Decap CMS](https://github.com/decaporg/decap-cms) / [configuration options](https://decapcms.org/docs/configuration-options/)
- [TinaCMS data layer](https://tina.io/docs/reference/content-api/data-layer)
- [Payload configuration overview](https://github.com/payloadcms/payload/blob/main/docs/configuration/overview.mdx)
- [Kirby blueprints](https://getkirby.com/docs/guide/blueprints/introduction) / [layout](https://getkirby.com/docs/guide/blueprints/layout)
- [SJSF custom components](https://x0k.github.io/svelte-jsonschema-form/guides/custom-components/)
- [RJSF](https://rjsf-team.github.io/react-jsonschema-form/docs/)
- [Vite plugin API](https://vite.dev/guide/api-plugin)

---

*Convention note: no prior `docs/research/` or `docs/notes/` existed; this file starts `docs/research/` for primary-source research notes.*
