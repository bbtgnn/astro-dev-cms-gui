# Form pipeline, dev-only route, and page preview

**Kind:** Working discussion capture (2026-09-12)  
**Domain:** root [`CONTEXT.md`](../../../CONTEXT.md)  
**Related:** [schema-driven CRUD research](16-schema-driven-crud-from-json-or-zod.md), [field schema model](../issues/07-field-schema-model.md), [write-back / `/_cms`](../issues/05-write-back-contract.md), [form UI composition](../issues/15-form-ui-composition.md), [spec §3–§5](../spec.md)

## Verdict

1. **Build our own list + form CRUD** — prior art does not deliver file-backed Astro/Zod → Svelte shell; we own the seams.
2. **Form generation path:** Zod (+ `.meta(FieldUi)`) → JSON Schema via `z.toJSONSchema` → derive sjsf `uiSchema` → form shell. Meta on Zod **does** flow into JSON Schema when using Zod 4 registries / `.meta()`.
3. **Host shape:** authoring shell as a **dev-only custom route** inside the Astro app (`/_cms/[...path]`) so hosts customize UI in-app (same Vite graph as field `meta.ui` components).
4. **Page preview** = open the **site URL** for the entry (same Astro `dev` server). Do not mount page components inside `/_cms`. Optional outer desktop shells may navigate that same URL; they are out of this monorepo.

---

## 1. Why build our own

From [16](16-schema-driven-crud-from-json-or-zod.md): almost nothing turns plain Zod / standard JSON Schema into a full file-backed CMS on a Svelte stack. Mature tools are form-only, proprietary JSON DSLs, or ORM/admin platforms. Closest Svelte form engines: `@sjsf/form`, autoform-svelte. Closest “list+form from Zod” shapes are React/Nuxt (borrow API ideas, not dependencies).

**Split we own:**

| Seam | Product owns |
| --- | --- |
| Schema → field widgets / form | `@cms/fields` + `@cms/form` (sjsf wrap) |
| Collection list + write-back | `@cms/crud` + `@cms/routes` (Astro collections → working tree) |

---

## 2. Zod `.meta()` → JSON Schema

Zod 4: `.meta()` registers on `z.globalRegistry`. `z.toJSONSchema()` copies **all** metadata fields into the output (including custom keys). Metadata overrides colliding generated keywords. Opt out with `{ metadata: z.registry() }`.

Caveats:

- Meta is bound to a **schema instance**; chaining after `.meta()` can drop it unless helpers re-attach.
- Astro typegen already uses `toJSONSchema` + global registry for `.astro/collections/*.schema.json` ([01](01-astro-schema-load-and-ui-metadata.md)); field-level meta is safer than fragile top-level object meta.
- **Non-JSON values** in meta (e.g. Svelte `Component`) do not survive `.schema.json` — need live Zod or a parallel registry at form-mount time.

Primary sources: [Zod JSON Schema](https://zod.dev/json-schema), [Zod metadata](https://zod.dev/metadata).

---

## 3. Form generation idea (locked direction)

Pass JSON Schema that carries serializable FieldUi meta; **compile** an sjsf `uiSchema` alongside it; feed both to `@sjsf/form` (via `@cms/form`).

```
content.config.ts     @cms/fields builders + .meta(FieldUi)
        │
        ▼
live Zod ──► z.toJSONSchema({ io: "input" }) ──► JSON Schema
        │                      │
        │                      └─► serializable meta (widget, label, options…)
        │                                    │
        │                                    ▼
        │                         @cms/form: meta → sjsf uiSchema
        │                                    │
        └─ live Component refs ──────────────┤
                                             ▼
                              form shell: schema + uiSchema
```

- sjsf keeps presentation in a separate tree (`ui:options`, `ui:components`, nested by property) — see [sjsf UI Schema](https://x0k.github.io/svelte-jsonschema-form/form/ui-schema/).
- Aligns with [07](../issues/07-field-schema-model.md) / [spec §4.1](../spec.md): builders return Zod; bridge Zod → JSON Schema + FieldUi → sjsf.

Two meta channels:

1. **JSON-serializable** — can live in `.schema.json` and drive a pure JSON → `uiSchema` pass.
2. **Live `meta({ ui: Component })`** — override; requires live Zod / registry; wins over widget defaults.

---

## 4. Dev-only route + in-app customization

**Agree:** shell as a **custom route in the Astro host**, available in **dev only**.

Matches `CONTEXT.md` (**authoring shell**, not production CMS server) and locked write-back:

- Mount: configurable; default **`/_cms/[...path]`**
- One dispatcher: shell UI + JSON API
- Write API **dev-only by default** (`import.meta.env.DEV` / `devOnly: true`)

“Customize as I wish” means the host owns Svelte modules and imports them from the **same Vite graph** as `/_cms` (themes, chrome, field `ui` components) — not a separate admin SPA.

Package map (consumer installs **`@cms/routes`** only):

```
@cms/fields → @cms/components → @cms/form → @cms/crud → @cms/routes → @cms/astro-template
```

| Package | Role in this sketch |
| --- | --- |
| `@cms/fields` | Zod + FieldUi; helpers that survive `toJSONSchema` |
| `@cms/form` | JSON Schema + meta → sjsf `uiSchema`; form shell |
| `@cms/crud` | list/get/upsert/delete + injectable writer |
| `@cms/routes` | Dev integration, mount, UI + API dispatcher |
| Host app | `content.config`, optional `.meta({ ui })`, overrides |

---

## 5. “Open page preview” button

### Preferred: site URL (same origin)

Preview **is** the mounted public page — as a **route**, not as a component imported into `/_cms`.

- Button → `window.open(previewPath)` or navigate / iframe to e.g. `/blog/my-post`
- Same Astro `dev` server: real layout, loaders, islands
- Needs **entry → URL** mapping (convention or collection `config({ previewPath })` — exact API not locked here)

### Do not

Import and render `BlogPost.astro` (or similar) inside the shell — fights page contracts (layouts, `getStaticPaths`, content APIs, CSS).

Optional later: iframe side-by-side on the same URL. External desktop shells (separate product) may also navigate that URL; not owned here.

---

## 6. Language reminders

Per `CONTEXT.md`: prefer **authoring shell**, **shell UI**, **form shell**, **dev integration**, **FieldUi** — avoid “admin panel / CMS server / admin SPA” as product terms even when sketching UI chrome.

---

## Open (not locked by this note)

- Exact `previewPath` / entry→URL config shape on `config()`
- Whether iframe split-view is a v1 shell feature
- End-user form chrome slots beyond field `meta.ui` ([15](../issues/15-form-ui-composition.md))
