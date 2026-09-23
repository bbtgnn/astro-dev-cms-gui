# Plan — CMS Input types from `content.config` (codegen)

**Status:** implemented (codegen + brands + options-only `defineCms`)  
**Branch:** `explore/schema-first-overlay`  
**Depends on:** content-proxy + stamped host (done); flattened `defineCms` options (done)  
**Parent:** [schema-first-overlay.md](../schema-first-overlay.md), [plan.md](./plan.md)

## Image / reference brands (decision)

Codegen detects content-proxy stamps and emits:

- `CmsImage` — branded string path  
- `CmsReference<"authors">` — branded string id + collection  

`ChromeFor` narrows optional `ui.*.kind` to `"image"` | `"reference"`. Also emits `CmsFieldKinds` for UI conditionals.

## Goal

Full **`ui` path type safety** for `defineCms(options)` via module augmentation of `CmsCollections` from user `content.config` — **Input** shape (persisted paths/ids), not Astro query Output.

Lean consumer API:

```ts
import { defineCms } from "@cms/astro/config";

export default defineCms({
  posts: {
    previewUrl: (id) => `/posts/${encodeURIComponent(id)}`,
    ui: {
      title: { label: "Post title" },
      cover: { label: "Cover" }, // autocomplete + reject unknown keys
    },
  },
});
```

Schemas stay in `content.config`; no parallel schema object in the overlay.

## Non-goals

- Superseding ADRs / GitHub #1
- Regenerating `content.config` (product generate stays dead)
- Typing live Svelte catalog props
- Non-Astro hosts (they pass plain Zod; optional later reuse of `ChromeFor<z.input<Z>>` only)
- Perfect deep typing of every Zod transform edge case in v1 (cover object/array/optional/nullable + stamped image/ref)

## Why codegen (not only `z.input<ReturnType<schemaFn>>`)

| Pure TS unwrap of `collections[name].schema` | Codegen after materialize |
| --- | --- |
| Collection keys + many field keys | Same |
| Function schemas OK via `ReturnType` | Same |
| `image()` / `reference()` leaves often **Output**-typed | Emitter sees **stamped Input** (`string` path / id) |
| No emit step | Emit + sync trigger |

**Decision:** codegen is the type source of truth for Astro overlay `ui`. Pure `z.input` unwrap may be used as a **fallback** when no generated file exists (weaker leaves), not as the happy path.

## Architecture

```text
src/content.config.ts
        │
        │  Vite plugin / `cms sync` (Node)
        │  + content-proxy aliases/shims
        ▼
  import { collections }
  materializeSchema each entry   ← same helper as FS host
        │
        ▼
  walk Zod → CMS Input structural type
  (objects, arrays, optionals; image/ref stamps → string)
        │
        ▼
  emit  src/cms.types.d.ts   (convention; gitignore or commit — TBD)
  or    virtual module ambient merge
        │
        ▼
  defineCms(options)
    options[K].ui : ChromeFor<CmsCollections[K]>
```

**Runtime `defineCms`:** presentation only (`overlays`, `types`, `getPreviewUrl`). Schemas stay on stamped `virtual:@cms/content-config`.

## Emitted contract

```ts
// src/cms.types.d.ts  (generated)
declare module "@cms/astro/collection-types" {
  export type CmsCollections = {
    authors: { name: string };
    posts: {
      title: string;
      draft: boolean; // follow z.input optionality
      body: string;
      cover?: string;
      author: string;
      seo?: { description?: string };
    };
  };
  export type CmsCollectionName = keyof CmsCollections;
}
```

`ChromeFor<T>` (in `@cms/astro` or `@cms/core/semantic`): recursive partial map of object keys → field chrome (`label`, `editor`, nested `fields` for objects). Unknown keys → error. Arrays: v1 chrome on the array field only; element chrome later if needed.

## Triggers

1. **Vite plugin** (primary in `cms()` setup): watch `content.config.*`; on load/change, emit types.
2. **`cms sync` CLI** (secondary): same emit for CI / editors without dev server.
3. Demo `tsconfig` includes the emitted file.

**Artifact policy (default):** `src/cms.types.d.ts` **gitignored** + regenerate on `dev`/`check`, with `cms sync` in package `check` scripts. Alternative: commit the file (noisier diffs).

## `defineCms` API

```ts
defineCms(options?: {
  [K in keyof CmsCollections]?: {
    previewUrl?: (id: string) => string | null;
    type?: "collection" | "singleton";
    ui?: ChromeFor<CmsCollections[K]>;
  };
});
```

- Options keys: `keyof CmsCollections` from module augmentation; before sync, loose `Record<string, CmsCollectionOptions>`.
- No collections arg — schemas live in `content.config`.
- Normalize to `{ overlays, getPreviewUrl, types }` for Vite soft-bind.

## Workstreams

### A — Zod → Input type printer

- Visitor over Zod (version aligned with `astro/zod`) after materialize.
- Stamp detection: content-proxy symbols / `.meta.cms` → emit `string`.
- Emit nested objects, optional/`nullable`, arrays (v1: array field chrome only).
- Golden tests: authors/posts fixture → expected `.d.ts` snippet.

### B — Loader + emit seam

- Shared `loadContentConfigForCms(projectRoot)` (Vite SSR or esbuild + shims) → materialized map.
- `emitCmsCollectionTypes(outPath, map)`.
- Wire into `cms()` Vite plugin + `bin/cms.ts sync`.

### C — Type surface + `defineCms`

- `ChromeFor<T>` + wire options to `CmsCollections`.
- Options-only `defineCms`; no runtime schema map on the overlay result.
- Ambient module `@cms/astro/collection-types` with empty stub in package; project emit augments via local `.d.ts`.

### D — Demos + DX

- Overlay demo: `defineCms({ … })` only.
- Simple demo: no cms.config (unchanged).
- README: sync / `dev` before editing overlay; remove dual-schema docs.
- Prune `postsSchemaInput` if unused.

## Sequencing

```text
11 defineCms accepts Astro collections + runtime materialize
   (collection-key options; ui loose or keyof-only)
        │
        ▼
12 Zod Input type printer + stamp→string + goldens
        │
        ▼
13 cms sync emit src/cms.types.d.ts + convention/gitignore
        │
        ▼
14 Vite emit in cms() + ui: ChromeFor<CmsCollections[K]>
        │
        ▼
15 Demo rewrite + check scripts call sync + docs
```

## Acceptance (whole plan)

- [x] Overlay demo: first arg is Astro `collections` from `content.config`
- [x] No `postsSchemaInput` / hand `schemas` map in demo
- [x] Unknown `ui` key (e.g. `titel`) is a TypeScript error
- [x] Stamped `cover` / `author` typed as `CmsImage` / `CmsReference` in generated types
- [x] Demo `check` runs sync (or depends on emit) and typechecks
- [x] `cms sync` documented; missing content.config → clear error
- [x] Runtime host/forms still from stamped content.config (codegen is types-only)

## Risks

| Risk | Mitigation |
| --- | --- |
| Zod version / private APIs fragile | Public Zod patterns + stamp meta; golden tests on upgrade |
| Emit lag vs editor | `cms sync` in check; Vite plugin on content.config change |
| Circular import content.config ↔ cms.config | One-way: cms.config imports collections; codegen loads content.config alone |
| Committed vs gitignored artifact | Default gitignore + sync in check |
| Array / union chrome | v1 narrow; document unsupported |

## Tickets (local)

| ID | Title | Blocked by |
| --- | --- | --- |
| 11 | `defineCms` accepts Astro collections + runtime materialize | — |
| 12 | Zod→CMS Input type printer + stamp→string + goldens | — |
| 13 | `cms sync` emit + convention/gitignore | 12 |
| 14 | Vite emit in `cms()` + `ChromeFor<CmsCollections[K]>` | 11, 13 |
| 15 | Overlay demo + docs/check scripts | 14 |

## Open decisions (resolve in 13/14)

1. Emit path: `src/cms.types.d.ts` vs `.astro/cms.types.d.ts`
2. Module id: ambient `@cms/astro/collection-types` vs global `CmsCollections`
3. Gitignore vs commit generated file

**Suggested defaults:** `src/cms.types.d.ts`, gitignore, ambient `@cms/astro/collection-types`.
