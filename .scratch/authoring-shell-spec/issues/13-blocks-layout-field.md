# blocksLayout field (polymorphic blocks)

Type: grilling
Status: resolved
Blocked by: 07, 02

## Question

Specify the **`blocksLayout` open-thread field**: product meaning (blocks list vs Kirby layout grid), value shape, builder / available-blocks API, UI bar for this slice, and persistence in YAML `data`.

## Answer

### Product meaning

- **Schema-native polymorphic page sections** — ordered list of typed blocks (`hero`, `cta`, …), each with a field schema + **site render `component`**.
- **Not** Editor.js / TipTap / BlockNote as the v1 field runtime (those are document editors; see [research](../research/13-blocks-layout-editors.md)).
- **Not** Kirby Layout grid / Craft.js canvas.
- Optional later: a **separate** long-form document field (TipTap preferred for official Svelte).

### Value shape

```ts
{ type: BlockType; content: T_block }[]
```

- Discriminator key: **`type`** (string literal per available block).
- Payload for that type lives under **`content`** (Kirby-like / Editor.js-`data` analogue) — keeps render props clean: `component` receives `content`.
- Unknown `type` values rejected; Zod per-type `content` schemas from the builder.
- No required persisted `id` in v1 (UI may use array index / ephemeral keys).
- Persist the **raw array** in YAML `data` — no Editor.js `{ time, version }` envelope.

### Builder

```ts
blocksLayout({
  label?: string,
  blocks: {
    hero: {
      schema: object({ title: text(), body: markdown() }),
      component: Hero, // opaque; host schema module imports real Astro/Svelte component
      label?: string,
    },
    cta: {
      schema: object({ label: text(), href: text() }),
      component: Cta,
    },
  },
})
```

- `blocks` required; at least one entry.
- Each entry: `schema` (Zod/FieldUi tree) + optional `component` (render binding) + optional `label`.
- `@cms/fields` stays framework-free — `component` typed `unknown` (same posture as `meta.ui`).

### Resolve / render helper (hosts)

- Export `resolveBlock(block, blocks)` → `{ component, props: content } | undefined`.
- Host keeps the same `blocks` map passed to the builder (or re-imports components) for page render.
- CMS preview of render components is **out of this slice** — editor shows type + form only.

### UI (this slice)

- Custom sjsf **array** widget in `@cms/form` (`blocksLayoutField`): add (pick type) / remove / reorder + per-type `content` editors via existing FieldUi.
- Clear registry `stub`; `sjsfWidget: "arrayField"`, `component: "blocksLayoutField"`.
- No third-party block editor; no live site-component preview in CMS.

### Sample

- `@cms/astro-template` `posts` gains a `blocks` field + YAML sample + at least two render components.

### Informed by

- [Field schema model](07-field-schema-model.md) — reserved widget → real builder
- [Prior art](02-prior-art-git-schema-cms.md) — Kirby fieldsets / Tina templates
- [Block editors research](../research/13-blocks-layout-editors.md) — schema-native vs document editors
- [Write-back contract](05-write-back-contract.md) — Zod input in `data`

## Comments

- 2026-09-09: Opened after i18n locale switcher; prior art points at Kirby fieldsets / Tina templates / Pages blocks; research already rejects Kirby layout grid as a v1 requirement (“ship simpler block lists first if anything”).
- 2026-09-09: Research landed — [research/13-blocks-layout-editors.md](../research/13-blocks-layout-editors.md). Verdict: don’t conflate **schema-native polymorphic sections** with **document block editors**; recommend schema-native for v1 `blocksLayout`.
- 2026-09-09: Round 1–2 locked: schema-native sections; builder declares types; min list+form UI; each block has render `component` co-located on the builder entry; site render first (CMS preview later); fields stays framework-free.
- 2026-09-09: Proceed locked Answer — `{ type, content }[]`; `resolveBlock`; form widget in `@cms/form`; sample on posts.
- 2026-09-09: Implemented — builder + `BlocksLayoutField` + posts sample + `/blocks-demo` host render via `resolveBlock`.
- 2026-09-09: Host note — keep render `component`s out of `content.config` imports (split schema map vs render map); Astro `.astro` in the content config graph breaks the posts collection.
