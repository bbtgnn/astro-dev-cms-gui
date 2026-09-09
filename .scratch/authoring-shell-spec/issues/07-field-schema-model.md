# Field schema model

Type: grilling
Status: resolved
Blocked by: 01

## Question

Given Astro’s constraints from [Astro schema load and UI metadata](01-astro-schema-load-and-ui-metadata.md), lock the **field schema** model (`Field<T> { schema, ui }` or chosen alternative): core scalars/objects for v1, how UI metadata attaches, and how **open threads** (`i18n`, `image`, `blocksLayout`) register as extension points without specifying deep behavior.

## Answer

### Model

- **Astro `schema` stays Zod.** Non-Zod `Field { schema, ui }` objects are **not** placed in `defineCollection({ schema })`.
- **Authoring API (`@cms/fields`):** named builders (`text`, `markdown`, `number`, …) **plus** generic `field(zod, ui)` escape hatch. Builders **return Zod** with FieldUi attached via `.meta()` / FieldUi registry (helpers own chaining order).
- **Internal descriptor** may look like `{ schema, ui }`; **public drop-in for Astro is always Zod.**
- **Primary UI channel:** FieldUi on the Zod instance. Parallel map / JSON Schema overlay may override later (discovery); not required for the default path.
- **Forms + write-back** edit/validate the Zod **input** shape (`toJSONSchema` / parse with input). Exotic transforms: custom UI or document limitations — no output-shape editing in v1.

### FieldUi shape

```ts
{ widget: string; label?: string; options?: Record<string, unknown> }
```

- No separate `id` — **`widget` is the registry key** for built-ins.
- **End-user / schema-author extension:** attach a Svelte component (or UI binding) directly on the field Zod, e.g. `z.string().meta({ ui: Component })` or via `field(zod, { ui: Component })`. Schema modules may import components; `@cms/fields` stays Svelte-free and types `ui` loosely.
- Built-in path: factories set `widget` (+ label/options); form shell resolves widget → default component. Direct `ui: Component` wins over widget defaults when present.
- Implication for [Collection and schema discovery](08-collection-discovery.md): default discovery must use **live Zod** (component refs are not serializable in `.schema.json`).

### Form bridge

Zod tree → `toJSONSchema` (input) + FieldUi / `ui` meta mapped into sjsf `uiSchema` (or equivalent). `@cms/fields` owns helpers; `@cms/form` consumes. Exact chrome/slots beyond this remain the form-composition **open thread**.

### v1 built-ins

- Scalars: string/text, number, boolean, enum/select, date/datetime  
- Compose: object, array  
- `markdown` (`widget: 'markdown'` only — **no** `role`/`segment` options in v1; multi-field file layout still fog)  
- Astro `reference()` → reference widget (select-like over target collection ids)  
- Astro `image()` → stub widget; deep wasm/srcset = **open thread**

### Open-thread extension points

Reserved widget ids + factory stubs: `i18n`, `image` (rich), `blocksLayout`. UI may show unsupported/extension until implemented; replace via `.meta({ ui: Component })` or later registry bindings. No deep contracts here.

### Informed by

- [Astro schema load and UI metadata](01-astro-schema-load-and-ui-metadata.md) + [research](../research/01-astro-schema-load-and-ui-metadata.md)
- [Monorepo package boundaries](04-monorepo-package-boundaries.md) — `@cms/fields` / `@cms/form`
- [Write-back contract](05-write-back-contract.md) — input-shaped `data`, multi-markdown in `data`

## Comments

- 2026-09-09: Locked factories→Zod+FieldUi; widget-keyed descriptor (no id); end-user `meta({ ui: Component })`; input-shape sjsf bridge; markdown widget without role/segment; reference + image stub.
