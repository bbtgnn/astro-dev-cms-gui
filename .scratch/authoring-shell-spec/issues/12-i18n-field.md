# i18n field (locale alternatives)

Type: grilling
Status: resolved
Blocked by: 07, 02

## Question

Specify the **`i18n` open-thread field**: value shape, builder options (`locales` / `defaultLocale` / `fallbacks`), UI bar, persistence, and relationship to Decap file layouts / Kirby `translate: false`.

## Answer

### Product meaning

- **Field-local locale map** inside YAML `data` — not Decap `multiple_folders` / `multiple_files` / `single_file`, not Kirby Panel language switcher.
- Deferred: collection-level locale path layouts; Kirby `translate: false` / Decap `duplicate` chrome.

### Value shape

```ts
{ [defaultLocale]: T } & Partial<Record<Exclude<Locale, Default>, T>>
```

- Zod: `defaultLocale` key **required**; other configured `locales` **optional**; **unknown keys rejected** (`.strict()`).
- Outer `.optional()` / `.nullable()` on the field: whole value may be absent/`null`; when an object is present, default key remains required.
- Inner `T` is any Zod field (e.g. `text()`, `markdown()`); authors may make `T` itself `.nullable()`.

### Builder

```ts
i18n(inner, {
  locales: ["en", "it"],
  defaultLocale: "en",
  fallbacks?: { it: "en" },
  label?: string,
})
```

- `inner` required; `locales` + `defaultLocale` required; `defaultLocale` ∈ `locales`.
- `fallbacks?: Partial<Record<locale, locale>>` optional.

### Resolve helper (hosts)

- Export `resolveLocale(value, locale, { defaultLocale, fallbacks? })`.
- Order: requested → follow `fallbacks` (cycle-guarded) → `defaultLocale` → `undefined`.
- **Write-back persists the raw map only** — do not materialize fallbacks into YAML.

### UI (this slice)

- Minimum: sjsf **object** editor over locale keys; clear registry `stub`.
- `toUiSchema` walks locale properties and propagates inner FieldUi (e.g. `i18n(markdown())` → textarea per locale).
- No side-by-side panes / collection language chrome.

### Sample

- `@cms/astro-template` `posts` gains one `i18n` field + YAML in `hello.yaml`.

### Informed by

- [Field schema model](07-field-schema-model.md) — reserved widget → real builder
- [Prior art](02-prior-art-git-schema-cms.md) — Decap/Kirby vocabulary as reference only
- [Write-back contract](05-write-back-contract.md) — Zod input in `data`

## Comments

- 2026-09-09: Locked field-local `Record`-as-object shape with required default; fallbacks resolve-only; minimum object UI.
