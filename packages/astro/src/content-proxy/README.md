# Content proxy (`@cms/astro`)

Host-only Vite plugin + shim modules that stamp Astro content-collection call
sites so the CMS host can recover:

- Loader location: `glob` → `{ kind, base, pattern }`, `file` → `{ kind, fileName }`
- Field kinds: `reference(collection)` and function-schema `image()`

User import paths stay `astro/loaders` and `astro:content`. Stamps live on
`Symbol.for` (loaders / content fields) plus Zod `.meta` where available.
**Read stamps only on the host/Node side** — never import `content.config` or
this package face into the browser authoring shell.

## Coverage limits

| Path | Stamped? |
| --- | --- |
| `import { glob, file } from "astro/loaders"` with boot aliases | Yes |
| `import { reference, defineCollection } from "astro:content"` with boot plugin | Yes (`reference`; `image` only when schema is a function using `ctx.image`) |
| Custom loaders (`Loader` objects, third-party packages) | **No** — need an explicit location escape (host join / later tickets) |
| Re-export wrappers that bypass the `astro/loaders` alias | **No** |
| Direct deep imports of Astro’s loader implementation files | **No** |

Optional esbuild emit for CLI/host-without-Vite is deferred.

## Form projection

Stamped schemas project to editor form models via
`@cms/core/semantic` (`projectSchemaFormModels`); the authoring shell mounts
through `@cms/authoring` (`authoringPropsFromFormModels`). See
[`packages/core/src/semantic/schema-form.md`](../../../core/src/semantic/schema-form.md)
(Ajv client vs authoritative Zod parse).

## Host join (ticket 04)

After Vite boot (or a shim-evaluated fixture), pass the content.config
`collections` export through
`collectionsFromContentConfigExport` → `buildFsHostFromStampedCollections`
(`@cms/astro/testing`):

1. Read `LOADER_STAMP` → write base under `contentRoot` (ADR-0007)
2. Rewrite stamped image/ref leaves to persisted **Input** strings for
   authoritative validate (ADR-0010); return `stampedSchemas` for form projection
3. **Fail closed** if a loader has no stamp, unless `locations[name] = { base }`
4. `file()` collections throw a clear unsupported error (v1 is glob + JSON)

Product `cms()` installs content-proxy in `astro:config:setup` and builds the
default host from stamped collections (ticket 05).
