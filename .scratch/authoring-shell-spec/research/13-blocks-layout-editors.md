# Block / blocks editors for `blocksLayout`

**Ticket:** [blocksLayout field](../issues/13-blocks-layout-field.md)  
**Question:** Which block-editor approaches are suitable to inform (or power) `@cms` `blocksLayout`, and what do their value shapes, custom-block APIs, Svelte/framework fit, and persistence models imply for the field contract?  
**Product frame:** Astro host + Svelte shell UI; packages `@cms/fields`, `@cms/form`, etc.; Zod + FieldUi drive editors; write-back to YAML content files; no always-on CMS server. Current stub: `blocksLayout()` → `z.array(z.record(z.string(), z.unknown()))` in `packages/fields/src/builders.ts`. Prior art ([02](./02-prior-art-git-schema-cms.md)) already points at Kirby fieldsets / Tina templates / Pages `block`, and rejects Kirby layout-grid as a v1 requirement.

## Verdict

Two different products are often conflated under “blocks”:

1. **Polymorphic page sections** — ordered list of typed objects (`hero`, `features`, `cta`), each with a **field schema** and form UI. This is what Kirby `blocks` + `fieldsets`, Tina `templates`, Payload `blocks`, Decap variable-type `list`, and Pages `block` implement.
2. **Block-style rich documents** — ordered list of editorial atoms (`paragraph`, `header`, `image`, …) edited in a Medium/Notion-like surface. This is what **Editor.js**, **BlockNote**, and (to varying degrees) **TipTap / Lexical / Plate** implement.

For **this** authoring shell’s `blocksLayout` open thread—builders declare available blocks, Zod validation, YAML `data`, reuse of existing field editors—the primary sources favor **(1) schema-native polymorphic lists**, not adopting a third-party document editor as the v1 persistence engine. Editor.js (and TipTap) remain useful **secondary** references if grilling later splits “page sections” from “long-form document body.”

## Short comparison

| Approach | Persisted data shape | Custom block definition | Svelte 5 feasibility | Schema / Zod alignment | Bundle / dep risk | Fit: “builders declare available blocks” |
| --- | --- | --- | --- | --- | --- | --- |
| **Editor.js** | `{ time, version, blocks: [{ id?, type, data }] }` ([Saving data](https://editorjs.io/saving-data/)) | Tool class: `render` / `save` (+ static `toolbox`); tools map keys become `type` ([Getting started](https://editorjs.io/getting-started/), [First plugin](https://editorjs.io/the-first-plugin/)) | Core is framework-agnostic DOM; **no first-party Svelte adapter**—community wrappers only (e.g. `svelty-editor`, `svelte-editorjs`) | Weak for nested FieldUi: each tool owns its DOM UI and `data` blob; hard to reuse `@cms` field widgets inside a Tool without bridging | `@editorjs/editorjs` ~0.7 MB unpacked + per-tool packages; Apache-2.0; recent GitHub activity (2026) | Strong for *which tools are enabled* via `tools: {…}`; weak for *schema-driven field trees* per block |
| **TipTap (+ ProseMirror)** | JSON tree `{ type: 'doc', content: [...] }` via `getJSON()` ([Concepts](https://tiptap.dev/docs/editor/core-concepts/introduction), [Output](https://tiptap.dev/docs/guides/output-json-html)) | `Node.create({ name, content, addAttributes, addNodeView, … })` ([Node API](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node)) | **Official Svelte / SvelteKit install guide** with runes example ([Install Svelte](https://tiptap.dev/docs/editor/getting-started/install/svelte)) | Good for document schema; poor match for CMS section objects unless every section is an atom/node-view embedding a form | Core + `@tiptap/pm` + starter-kit (MIT); ProseMirror weight; extension sprawl | Extensions list ≈ available nodes; not the same as “pass Zod field schemas for hero/cta” |
| **BlockNote** | Flat-ish `Block[]`: `{ id, type, props, content, children }` ([Document structure](https://www.blocknotejs.org/docs/foundations/document-structure)) | `createReactBlockSpec` + schema ([Custom blocks](https://www.blocknotejs.org/docs/features/custom-schemas/custom-blocks)); vanilla `@blocknote/core` exists but UI must be rebuilt ([Vanilla JS](https://www.blocknotejs.org/docs/getting-started/vanilla-js)) | React-first; vanilla loses built-in menus—**poor Svelte custom-block story** | Structured JSON, but props/content model ≠ `@cms` FieldUi trees; MPL-2.0 on `@blocknote/core` | Large core unpack (~9 MB reported on npm tarball metadata); TipTap/ProseMirror underneath ([Intro](https://www.blocknotejs.org/docs)) | Schema of allowed block types yes; builder→Zod field registry no |
| **Lexical** | EditorState JSON via `toJSON()` / `parseEditorState` ([Serialization](https://lexical.dev/docs/serialization/), [React getting started](https://lexical.dev/docs/getting-started/react)); core ~22 kb claim ([Intro](https://lexical.dev/docs/intro)) | Custom nodes: `exportJSON` / `importJSON` ([Serialization](https://lexical.dev/docs/serialization/)) | Official bindings emphasize **React** (`@lexical/react`); vanilla possible, no first-party Svelte shell | Editor-framework JSON, not CMS polymorphic YAML sections | MIT; you assemble UI yourself | Node registration ≠ field-schema builders |
| **Plate** | Slate/Plate JSON `value` / document state ([Controlled value](https://platejs.org/docs/controlled), [Serializing](https://next.platejs.org/docs/slate/concepts/10-serializing)) | Headless plugins + copied React UI registry ([Plate docs](https://platejs.org/docs)) | **React-only** compatibility called out in docs | Same class as rich-text frameworks | MIT; shadcn-style UI copy-in | Leave for this Svelte product |
| **Craft.js** | Serializable editor JSON (`query.serialize()`) ([Overview](https://craft.js.org/docs/overview)) | React user components + droppable canvases | React page-builder, not field registry | Layout canvas state ≠ Astro content Zod | MIT-ish community; different product category | **Leave**—visual page builder, not schema→YAML blocks |
| **Payload `blocks` field** | Array of objects; each has `blockType` (= slug) + field values (+ optional `blockName`) ([Blocks field](https://payloadcms.com/docs/fields/blocks)) | Block config: `slug` + `fields[]`; field lists available blocks ([Blocks field](https://payloadcms.com/docs/fields/blocks)) | N/A (Payload admin); **pattern only** | Excellent analogue for Zod discriminated unions / per-type object schemas | No editor lib—schema + admin UI | **Strong model** for builder API |
| **Kirby `blocks`** | Items with `type` + `content` (+ `id`, `isHidden` in Panel API array) ([Block.php `toArray`](https://github.com/getkirby/kirby/blob/5.5.3/src/Cms/Block.php); defaults use `type`/`content` in field docs ([Blocks](https://getkirby.com/docs/reference/panel/fields/blocks))) | Blueprint `fieldsets` list / groups; custom types with nested `fields` ([Custom blocks](https://getkirby.com/docs/guide/page-builder/custom-blocks)) | N/A (Panel); **pattern only** | Nested fields per type map cleanly to FieldUi | No JS editor dependency | **Strongest prior-art match** already cited in ticket 02 |
| **Tina `templates`** | List of objects; GraphQL `__typename` / template `name` discriminates ([Tina blocks](https://tina.io/docs/editing/blocks)) | `object` + `list: true` + `templates: [{ name, fields }]` | N/A (Tina UI); pattern only | Per-template field lists ↔ builders | GraphQL stack out of scope for v1 write path | Strong for available-blocks declaration |
| **Decap variable-type `list`** | Array of objects with `type` key (configurable `typeKey`) + type-specific fields ([Variable type widgets](https://decapcms.org/docs/variable-type-widgets/)) | `types: [{ name, widget: object, fields }]` | N/A; pattern only | YAML-friendly; matches stub direction | No block-editor lib | Strong for YAML persistence |
| **Keystatic document / array** | Document: Markdoc/MDX-oriented rich text + `componentBlocks` with nested schemas ([Document](https://keystatic.com/docs/fields/document)); Array: homogeneous or object items ([Array](https://keystatic.com/docs/fields/array)) | `component({ label, schema, preview })` inside document; or `array(object(…))` | React admin; pattern only | Component-block schemas close to FieldUi; document body is not a plain YAML block list | Keystatic stack | Borrow for *document* body later; for `blocksLayout` prefer array/object or Tina-like templates |

## System notes (primary sources)

### Editor.js

- Positioned as a **block-style** editor that outputs **clean JSON** instead of HTML; workspace is separate Blocks united by the core ([Base concepts](https://editorjs.io/base-concepts/)).
- Persist via `editor.save()` → `{ time, blocks, version }`. Each block has `type` + `data` (and commonly `id`). `type` is the key used in config `tools` ([Saving data](https://editorjs.io/saving-data/), [Getting started](https://editorjs.io/getting-started/)).
- Custom blocks = **Tools**: minimum `render()` (DOM) and `save(blockContent)` returning the `data` object; optional static `toolbox` for title/icon ([The first plugin](https://editorjs.io/the-first-plugin/)).
- Only Paragraph ships in core; other blocks are separate packages connected through `tools` ([Getting started](https://editorjs.io/getting-started/)).
- License: **Apache License 2.0** ([LICENSE](https://raw.githubusercontent.com/codex-team/editor.js/next/LICENSE); npm `license: Apache-2.0` on `@editorjs/editorjs@2.31.6`).
- Maintenance posture: active upstream (npm 2.31.x; GitHub `codex-team/editor.js` pushes through 2026-08). Large issue surface (~700 open issues on the repo metadata snapshot)—expect community Tools of uneven quality.
- Framework fit: **vanilla JS core**. No official Svelte binding in Editor.js docs. Community options exist (e.g. [pablo-abc/svelte-editorjs](https://github.com/pablo-abc/svelte-editorjs) action; npm `svelty-editor` peer on Svelte 5 + Editor.js)—treat as **unofficial**, not a product dependency commitment.
- Implication: adopting Editor.js as the *editor* couples `blocksLayout` to Tool DOM UIs and the `{time,version,blocks}` envelope (or a stripped `blocks[]`). Adopting only the *shape* (`type` + `data`) without the library is feasible and overlaps Kirby/Tina naming (`type` + payload).

### TipTap / ProseMirror

- Document is a **strict schema tree**; recommended persistence is **Tiptap JSON** (`editor.getJSON()`), optionally HTML ([Concepts](https://tiptap.dev/docs/editor/core-concepts/introduction), [Output JSON/HTML](https://tiptap.dev/docs/guides/output-json-html)).
- Custom “blocks” are **nodes** (and marks), including advanced **node views** for non-text UI ([Node API](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node)).
- First-party **Svelte** integration is documented (mount `Editor` in `onMount`, destroy on teardown; runes example) ([Install Svelte](https://tiptap.dev/docs/editor/getting-started/install/svelte)).
- Fit: excellent for a **rich-text / long-form** field; awkward as the sole model for **page-builder sections** whose natural storage is flat YAML objects with many scalar/object fields—those become atom nodes + node views that reimplement the form system inside ProseMirror.

### BlockNote

- Explicitly **block-based**, Notion-like UX; built on ProseMirror/TipTap ([Introduction](https://www.blocknotejs.org/docs)).
- Document = array of `Block` with `id`, `type`, `props`, `content`, `children` ([Document structure](https://www.blocknotejs.org/docs/foundations/document-structure)).
- Custom blocks documented via **`createReactBlockSpec`** ([Custom blocks](https://www.blocknotejs.org/docs/features/custom-schemas/custom-blocks)). Vanilla `@blocknote/core` can mount without React but docs warn you lose built-in UI and must rebuild menus ([Vanilla JS](https://www.blocknotejs.org/docs/getting-started/vanilla-js)).
- License note: `@blocknote/core` npm metadata reports **MPL-2.0** (verify copyleft obligations if vendoring).
- Fit for Svelte shell: **weak** unless accepting React islands or rebuilding UI.

### Lexical / Plate

- **Lexical**: editor framework; serializable EditorState JSON; React package is the documented app path ([Intro](https://lexical.dev/docs/intro), [Serialization](https://lexical.dev/docs/serialization/), [React](https://lexical.dev/docs/getting-started/react)). Payload’s rich-text path uses Lexical and can embed Payload **blocks** inside it ([Payload blocks](https://payloadcms.com/docs/fields/blocks))—interesting hybrid, but Lexical itself is not a schema→YAML page-section field.
- **Plate**: React rich-text framework on Slate; persist JSON `value` ([Plate docs](https://platejs.org/docs), [Controlled](https://platejs.org/docs/controlled)). Explicitly React-oriented—leave for this product.

### Craft.js

- Modular **React page editor** with drag-and-drop and `serialize()` JSON ([Overview](https://craft.js.org/docs/overview)). Wrong layer for Zod field builders and Astro YAML entries; leave for v1 (and likely indefinitely for `blocksLayout`).

### Schema-driven CMS block fields (not editor libraries)

These are the closest **product** matches to an authoring-shell field:

- **Kirby**: `type: blocks` + `fieldsets` (ordered allow-list, groups); custom types declare nested `fields`; defaults and content use `type` + `content` ([Blocks](https://getkirby.com/docs/reference/panel/fields/blocks), [Custom blocks](https://getkirby.com/docs/guide/page-builder/custom-blocks)). Panel API array shape includes `content`, `id`, `isHidden`, `type` ([Block::toArray](https://github.com/getkirby/kirby/blob/5.5.3/src/Cms/Block.php)).
- **Tina**: `object` + `list` + `templates[]` each with `name` + `fields`; optional visual selector ([Tina blocks](https://tina.io/docs/editing/blocks)).
- **Payload**: `type: 'blocks'` + `blocks: [{ slug, fields }]`; stored `blockType` discriminator ([Blocks field](https://payloadcms.com/docs/fields/blocks)).
- **Decap**: `list` + `types` of `object` widgets; output items carry `type` ([Variable type widgets](https://decapcms.org/docs/variable-type-widgets/)).
- **Pages CMS**: built-in field type `block` = “Multiple object shapes in one list” ([Fields](https://pagescms.org/docs/configuration/content/fields/)).
- **Keystatic**: prefer `array` + `object` for structured lists; `document` / Markdoc **component blocks** for rich-text-embedded components ([Array](https://keystatic.com/docs/fields/array), [Document](https://keystatic.com/docs/fields/document))—closer to a body field than to `blocksLayout` as page sections.

## Take / leave for this authoring shell

### Take

1. **Product meaning for v1 `blocksLayout`:** ordered **polymorphic block list** (page sections), **not** Kirby layout grid, **not** a full Notion clone. Aligns with ticket comments and research 02.
2. **Value-shape family from CMS prior art (pick one naming in grilling, don’t invent deep APIs here):**
   - Kirby-like: `{ type, content: { …fields } }[]`
   - Decap/Tina-like flattened: `{ type, …fields }[]`
   - Payload-like: `{ blockType, …fields }[]`  
   All are YAML-friendly and Zod-discriminatable. Prefer **not** requiring Editor.js `time` / `version` in content files unless Editor.js is the runtime editor.
3. **Builder declares available blocks** the way Kirby `fieldsets`, Tina `templates`, Payload `blocks`, and Editor.js `tools` keys do: an allow-list of type ids → each type’s field schema / UI. Map onto `@cms/fields` builders + existing form widgets.
4. **UI bar for v1:** add / remove / reorder + per-type form (drawer or inline)—Kirby/Tina/Payload pattern—implemented in Svelte with the shell’s form stack. That meets “minimum UI bar” without a third-party editor.
5. **Editor.js as optional later path or shape inspiration:** flat `blocks[].type` + `blocks[].data` is a clean document model if grilling adds a **separate** long-form field; Tools API shows how plugins register into an allow-list ([Saving data](https://editorjs.io/saving-data/), [Getting started](https://editorjs.io/getting-started/)).
6. **TipTap as the Svelte-friendly rich-text escape hatch** if a future field needs inline editing / marks / HTML↔JSON—not as the default `blocksLayout` store ([Install Svelte](https://tiptap.dev/docs/editor/getting-started/install/svelte), [Output](https://tiptap.dev/docs/guides/output-json-html)).

### Leave (explicitly reject for v1 / core `blocksLayout`)

1. **Adopting BlockNote, Plate, Lexical, or Craft.js as the field runtime** — React-first (or page-builder) stacks fight the Svelte shell and FieldUi registry ([BlockNote intro](https://www.blocknotejs.org/docs), [Plate FAQ](https://platejs.org/docs), [Lexical React](https://lexical.dev/docs/getting-started/react), [Craft.js](https://craft.js.org/docs/overview)).
2. **Persisting ProseMirror/Lexical/Slate trees as the only YAML representation of page sections** — hostile to hand-edited content files and simple Zod object schemas.
3. **Making Editor.js Tools the extension API for CMS blocks** — Tools own DOM `render`/`save`, bypassing Zod FieldUi components ([First plugin](https://editorjs.io/the-first-plugin/)).
4. **Kirby layout grid / Craft.js canvas** as v1 scope (already rejected in research 02).
5. **Locking a deep `@cms` contract** in this research file—grilling owns the Answer on ticket 13.

## Implications for ticket 13 (non-binding)

- **Research-backed directions for the grilling Answer (pick 1–2):**
  1. **Primary:** Schema-native polymorphic array (Kirby/Tina/Payload/Decap lineage); builders pass available block types + per-type field schemas; Svelte list UI; persist plain YAML; no third-party block editor in v1.
  2. **Alternate / split:** Keep (1) for `blocksLayout` page sections; if long-form block documents are needed, add a **different** field later powered by **TipTap** (Svelte-official) or **Editor.js** (JSON blocks), without overloading `blocksLayout`.
- Do **not** treat “research Editor.js” as a mandate to ship Editor.js—use it to clarify data-model options and to reject conflating document editors with schema-driven section lists.
- Stub `z.array(z.record(…))` should tighten toward a **discriminated** shape once grilling chooses `type`+`content` vs flat `type`+fields.

## Sources

- Editor.js: [base concepts](https://editorjs.io/base-concepts/), [getting started / tools](https://editorjs.io/getting-started/), [saving data](https://editorjs.io/saving-data/), [creating a block tool](https://editorjs.io/creating-a-block-tool/), [first plugin](https://editorjs.io/the-first-plugin/), [API](https://editorjs.io/api/), [LICENSE](https://raw.githubusercontent.com/codex-team/editor.js/next/LICENSE), [GitHub repo](https://github.com/codex-team/editor.js)
- Community Svelte wrappers (non-official): [svelte-editorjs](https://github.com/pablo-abc/svelte-editorjs), [sveditorjs](https://github.com/pouchcms/sveditorjs)
- TipTap: [concepts / JSON](https://tiptap.dev/docs/editor/core-concepts/introduction), [output JSON/HTML](https://tiptap.dev/docs/guides/output-json-html), [custom Node API](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node), [Svelte install](https://tiptap.dev/docs/editor/getting-started/install/svelte)
- BlockNote: [introduction](https://www.blocknotejs.org/docs), [document structure](https://www.blocknotejs.org/docs/foundations/document-structure), [custom blocks](https://www.blocknotejs.org/docs/features/custom-schemas/custom-blocks), [vanilla JS](https://www.blocknotejs.org/docs/getting-started/vanilla-js)
- Lexical: [intro](https://lexical.dev/docs/intro), [serialization](https://lexical.dev/docs/serialization/), [React getting started](https://lexical.dev/docs/getting-started/react)
- Plate: [docs / React](https://platejs.org/docs), [controlled value](https://platejs.org/docs/controlled), [serializing](https://next.platejs.org/docs/slate/concepts/10-serializing)
- Craft.js: [overview](https://craft.js.org/docs/overview)
- Payload: [blocks field](https://payloadcms.com/docs/fields/blocks)
- Kirby: [blocks field](https://getkirby.com/docs/reference/panel/fields/blocks), [custom blocks](https://getkirby.com/docs/guide/page-builder/custom-blocks), [Block.php](https://github.com/getkirby/kirby/blob/5.5.3/src/Cms/Block.php)
- Tina: [blocks / templates](https://tina.io/docs/editing/blocks)
- Decap: [variable type widgets](https://decapcms.org/docs/variable-type-widgets/)
- Pages CMS: [fields overview (`block`)](https://pagescms.org/docs/configuration/content/fields/)
- Keystatic: [document / component blocks](https://keystatic.com/docs/fields/document), [array](https://keystatic.com/docs/fields/array)
- Related research: [02 prior art](./02-prior-art-git-schema-cms.md)
