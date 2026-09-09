# Rich image field

Type: grilling
Status: resolved
Blocked by: 07, 01

## Question

Specify the **rich `image` open-thread field**: product meaning vs Astro `image()` / path stub, persisted value shape, authoring UI bar, any encode/srcset pipeline (wasm webp called out in map — do not invent until locked), and sample wiring in `@cms/astro-template`.

## Answer

### Product meaning

- **Authoring-time image pipeline:** choose file → **dev-only `/_cms` API** converts with **`sharp`** to **WebP** at configured widths → writes a **folder beside the content entry** → YAML stores **one canonical path**.
- Site render uses a **host wrapper** (`CmsImage` / resolve-srcset) over those files — **not** stock Astro `<Image>` srcset (that pipeline targets `/_image` / `dist/_astro`, not beside-content derivatives).
- Clears map fog “wasm webp + srcsets”: **server sharp** for v1 convert+sizes; browser wasm (jSquash) deferred; Squoosh lib/cli retired ([research](../research/14-image-resize-modules.md)).

### Value shape

- Zod / FieldUi: **`z.string()`** path (same portable stub upgraded) — relative path to the **canonical file**, e.g. `./cover/cover.webp`.
- Derivatives are **on disk only**; do **not** persist a multi-path / srcset object in YAML `data`.
- Astro Content Layer `image()` remains compatible for the canonical file (metadata for single-src); responsive URLs come from the host wrapper + folder convention.

### On-disk layout

- Folder **beside the entry** (e.g. next to `hello.yaml`): `cover/cover.webp` + `cover/480.webp` + `cover/960.webp`.
- **`cover.webp`** = WebP at the **largest configured width** (no separate duplicate max file).
- Other widths: `{width}.webp` only for **non-canonical** widths.
- **Discard** the original upload after a successful transaction (folder = webps only).

### Defaults (API + builder)

- Widths: **`[480, 960, 1600]`**
- WebP quality **~80**; sharp **`withoutEnlargement: true`**; **`rotate()`** for EXIF.
- Builder may override widths/quality later (`image({ widths?, quality?, label? })`); defaults required for the demo.
- Input v1: **JPEG / PNG / WebP**. Out: animated GIF/WebP, SVG rasterization.
- Deno: **best-effort** via sharp’s documented Deno/npm path; Bun/Node are the validation baseline.

### Binary / API

- Extend **`Writer`** with binary ops (`writeBytes` / `readBytes` as needed) + allowlisted paths.
- Dev-only **`/_cms`** route: accept upload → sharp width loop → write folder → return canonical relative path for the form value.
- Shared seam in **`@cms/routes` / `@cms/crud`** (not template-only FS bypass). Sharp dependency on the package that owns the route.

### UI (this slice)

- Clear `image` registry **stub**; real widget in `@cms/form` (picker → call image API → set path string; preview).
- `@cms/fields` stays Svelte-free.

### Host sample

- `@cms/astro-template`: sample `image` field on posts + YAML path; **`CmsImage`** (or equivalent) demo page using folder convention for `srcset`.
- Keep render helpers out of `content.config` (same split as blocks).

### Informed by

- [Field schema model](07-field-schema-model.md) — image stub → real widget
- [Astro schema load](01-astro-schema-load-and-ui-metadata.md) — path in / metadata out
- [Write-back contract](05-write-back-contract.md) — allowlisted writer; extend for bytes
- [Image resize modules](../research/14-image-resize-modules.md) — sharp over wasm/jSquash for server API

## Comments

- 2026-09-09: Opened after blocksLayout smoke. Stub: `image()` → `z.string()` + `stub: true`.
- 2026-09-09: Round 1 — path + upload intent; fog on wasm/srcset.
- 2026-09-09: Free-form — full choose→webp+sizes flow; folder beside content; research modules.
- 2026-09-09: Research — [14-image-resize-modules](../research/14-image-resize-modules.md).
- 2026-09-09: Rounds 3–6 — canonical file in folder; host CmsImage wrapper in sample; sharp on `/_cms`; discard original; defaults 480/960/1600; Writer binary + shared routes/crud; lock Answer (JPEG/PNG/WebP, EXIF rotate; Deno best-effort).
- 2026-09-09: Implemented — Writer bytes; `POST /_cms/api/images` + `GET /_cms/api/assets/*`; ImageField; posts `cover`; `/image-demo` + `CmsImage`; `check:image`.
