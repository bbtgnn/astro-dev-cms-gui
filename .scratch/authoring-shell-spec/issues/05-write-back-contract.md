# Write-back contract (files-only v1)

Type: grilling
Status: resolved

## Question

Specify the v1 **write-back** contract for dogfood: how the Svelte **shell UI** asks the Astro/dev process to read/list/update **content entries** on disk (routes/endpoints, payloads, error model, path safety). Keep **shell commit/command execution** as an **open thread**—mention the seam, do not design it.

## Answer

### Write mode ops (v1)

Injectable **write mode** supports: `listCollections`, `listEntries`, `getEntry`, `upsertEntry`, `deleteEntry`.  
`runCommand` (and similar) is **reserved** on the seam for the shell-commands **open thread** — not implemented in v1.

### HTTP / routing

Single catch-all under the shell mount: **`/_cms/[...path]`** (prefix configurable). One dispatcher handles shell UI segments and JSON API paths (e.g. `api/collections/...`). Consumer adds one handler via `@cms/routes` **dev integration**.

### Entry payload

```ts
{ id: string; collection: string; data: Record<string, unknown> }
```

- `data` is the collection Zod **input** shape (all fields).
- **No** privileged single `body` — multiple markdown fields live in `data`; FieldUi / serialization (how they land in one file) is deferred to field-schema / discovery tickets.
- Server maps `(collection, id)` → filesystem path; **clients never send FS paths**.

### Validation & conflicts

- `safeParse` with collection Zod (input) **before** write; `400` on failure.
- v1 **last-write-wins**; optional `ifMatch` later.

### Writer injection

```ts
createWriteMode({
  root,
  allowPaths,
  writer, // e.g. denoFsWriter() | nodeFsWriter() | /* later */ githubRepoWriter()
})
```

- **Writer** = low-level read/write/remove/list within allowlisted roots.
- **Write mode** = domain ops + Zod validation + path mapping; calls the writer.
- v1 ships **FS writers** only (Deno/Node). `githubRepoWriter` / command writers are **seams** (open thread / out of v1 hosted-Git path).
- Document Deno scoped `--allow-write` for dogfood tasks.

### Guard

Write API **dev-only by default** (`import.meta.env.DEV` / integration `devOnly: true`). Refuse in production builds unless explicitly overridden (not the default product posture).

### Informed by

- [Monorepo package boundaries](04-monorepo-package-boundaries.md) — `crud` write mode + `routes` injection
- [Deno template research](../research/03-deno-astro-template-runtime.md) — local FS, `--allow-write`, not Deploy
- [Astro schema research](../research/01-astro-schema-load-and-ui-metadata.md) — input shape, `filePath` server-side
- [Prior art](../research/02-prior-art-git-schema-cms.md) — in-process write-back; reject hosted Git as v1 default

## Comments

- 2026-09-09: Locked catch-all `/_cms/[...path]`, multi-markdown-in-`data`, pluggable writer objects (not runtime string enum).
