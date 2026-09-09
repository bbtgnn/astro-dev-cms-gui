# Monorepo package boundaries for @cms/*

Type: grilling
Status: resolved

## Question

Lock responsibilities and dependency direction for `@cms/fields`, `@cms/components`, `@cms/routes`, and `@cms/astro-template`: what each owns, what it must not own, and how a consumer GitHub-installs enough to get an **authoring shell** in their Astro app vs using the template as the dogfood host.

## Answer

### Graph

```
@cms/fields → @cms/components → @cms/form → @cms/crud → @cms/routes → @cms/astro-template
                    └── shadcn/ (+ other modules)
```

No separate `@cms/collection` package: collection list/IA is composed in `@cms/routes` (chrome from `@cms/components`).

### Ownership

| Package | Owns | Must not |
|---|---|---|
| `@cms/fields` | Zod builders, FieldUi registry + default descriptors, Zod→JSON Schema helpers | Svelte, Astro, FS I/O |
| `@cms/components` | `shadcn/` primitives and related files; other shared chrome modules | Write-back, sjsf field pipeline |
| `@cms/form` | Wrap [svelte-jsonschema-form](https://x0k.dev/svelte-jsonschema-form/); form shell; form-specific widgets (compose `components` / shadcn) | HTTP/FS, Astro integration; apps should not need raw `@sjsf/*` for the default path |
| `@cms/crud` | DTOs, fetch client, **write-mode** interface (injectable read/write adapter) | Svelte UI |
| `@cms/routes` | Astro **dev integration**, shell pages, HTTP endpoints; **injects** concrete write mode (local FS) | Field registry defs, deep widget implementations |
| `@cms/astro-template` | Deno-first dogfood Astro app: sample collections, wiring | Reimplementing the packages above |

### Install / workspace

- **Consumer surface:** depend on `@cms/routes` (pulls the graph); add the Astro integration; configurable mount path.
- **Workspace:** Deno-first root `deno.json` workspace; each publishable package + template has its own `package.json` for Node/Bun compat; root `package.json` optional/generated for installable module + template—not pnpm-yaml-only.
- **Runtimes:** Deno preferred for template dogfood; Node portable baseline for packages (Bun may install via package.jsons without owning the workspace).

### Open thread (surfaced here)

- **End-user form UI composition:** form widgets/chrome must be overrideable; exact slots API beyond sjsf theme/`ui:components` + FieldUi → later ticket. Spec must state the requirement.

### Informed by

- [Astro schema load and UI metadata](01-astro-schema-load-and-ui-metadata.md) — Zod-only Astro schema; UI via registries / parallel map
- [Prior art…](02-prior-art-git-schema-cms.md) — field registry, custom-field packages, in-process write-back
- [Deno as @cms/astro-template runtime](03-deno-astro-template-runtime.md) — Deno dogfood, Node baseline, workspace formats

## Comments

- 2026-09-09: Grilled and locked; mid-layers `form` + `crud` added; `collection` dropped as its own package; write mode injectable; sjsf wrap + shadcn under components.
