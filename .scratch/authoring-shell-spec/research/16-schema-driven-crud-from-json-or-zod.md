# Schema-driven CRUD from JSON Schema and/or Zod

**Question:** What full CRUD systems (admin panels, APIs, forms+tables+create/edit/delete) can be generated from a **JSON Schema** and/or a **Zod** schema?  
**Product frame:** CMS/authoring shell that may generate CRUD UIs from content schemas (Astro content collections / Zod). Related: [Astro schema load](01-astro-schema-load-and-ui-metadata.md), [prior art git-schema CMS](02-prior-art-git-schema-cms.md), [form UI composition](../issues/15-form-ui-composition.md).  
**Method:** Primary docs, GitHub READMEs, npm package pages, and first-party APIs. Stars/licenses from GitHub API / npm metadata as of 2026-09-12. “JSON Schema” below means the [JSON Schema](https://json-schema.org/) vocabulary unless noted as a **proprietary JSON resource DSL**.

## Verdict

1. **Almost nothing turns a plain Zod or standard JSON Schema alone into a complete file-backed CMS admin.** Mature products either (a) render **forms only**, (b) generate **API/DB CRUD** from a proprietary JSON/YAML DSL (not JSON Schema), or (c) generate **admin UIs from ORM/DB models** (Prisma, Drizzle, Directus collections)—not from Zod/JSON Schema as the primary input.
2. **Best mature form engines for this stack:** standard **JSON Schema → forms** via [JSON Forms](https://jsonforms.io/) (React/Angular/Vue) or [react-jsonschema-form](https://rjsf-team.github.io/react-jsonschema-form/) (~16k★); **Zod → forms** via [AutoForm](https://autoform.vantezzen.io/) / [`@autoform/zod`](https://www.npmjs.com/package/@autoform/zod) (~3.5k★) or [Uniforms](https://github.com/vazco/uniforms) (JSON Schema + Zod bridges). For **Svelte 5**, the closest primary options are [`@sjsf/form`](https://github.com/x0k/svelte-jsonschema-form) (JSON Schema + optional Zod v4 validator) and [autoform-svelte](https://github.com/Convex-Works/autoform-svelte) (Zod / JSON Schema adapters)—forms only.
3. **Closest “list + form CRUD from Zod”:** [`@wordrhyme/auto-crud`](https://www.npmjs.com/package/@wordrhyme/auto-crud) (React tables/forms from Zod; you supply data sources) and [AutoAdmin](https://github.com/awecode/autoadmin) JSON resources (Nuxt admin list/create/update/delete for JSON files registered with Zod—closest file/git CMS cousin, but Nuxt/Drizzle-centric).
4. **Full-stack “schema → API + admin” tools exist, but they consume proprietary JSON resource files**, not JSON Schema Drafts: [NextMin](https://nextmin.gscodes.dev/), [autocrud-core](https://github.com/vaibhavr2107/autocrud), [Crouton](https://github.com/GhentCDH/crouton) (NestJS+Vue, WIP/alpha). Do not confuse these with JSON Schema.
5. **Bridge for Astro:** Zod 4 ships native [`z.toJSONSchema`](https://zod.dev/json-schema) / experimental `z.fromJSONSchema`; older stacks use [`zod-to-json-schema`](https://www.npmjs.com/package/zod-to-json-schema). Astro already emits `.astro/collections/*.schema.json` via `z.toJSONSchema` ([research 01](01-astro-schema-load-and-ui-metadata.md))—so a shell can feed **JSON Schema form engines** without abandoning Zod as the source of truth.

---

## Taxonomy

| Bucket | What you get from “schema” | Persistence / API | Typical input |
| --- | --- | --- | --- |
| **Form-only** | Create/edit form widgets + validation | Caller wires submit | JSON Schema and/or Zod |
| **List + form CRUD UI** | Table/list + create/edit/delete screens | Data provider / fetch hooks / in-memory | Zod (+ config); rarely pure JSON Schema |
| **API CRUD generator** | REST/GraphQL endpoints, models | DB adapters | Proprietary JSON/YAML DSL (± AJV) |
| **Full-stack admin platform** | Admin UI + API + auth + files | ORM/DB or hosted | DB models / platform schema—not Zod/JSON Schema first |
| **Codegen scaffolding** | Emits source for controllers/views | You own runtime | Proprietary JSON config / OpenAPI |

Important naming trap: many tools advertise “JSON schema” meaning **a JSON file describing entities**, not the IETF/JSON Schema draft vocabulary.

---

## JSON Schema → CRUD options

| Tool | Input (primary) | Generates | Runtime vs codegen | Stack | Maturity | License | Notes / Zod bridge |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **[react-jsonschema-form (RJSF)](https://github.com/rjsf-team/react-jsonschema-form)** | JSON Schema (+ uiSchema) | **Forms only** | Runtime | React; themes Ant/MUI/Chakra/shadcn/… | ~15.9k★, active | Apache-2.0 | Standard JSON Schema form builder ([docs](https://rjsf-team.github.io/react-jsonschema-form/docs/)); feed via `z.toJSONSchema` / zod-to-json-schema |
| **[JSON Forms](https://jsonforms.io/)** (EclipseSource) | JSON Schema Draft 4 & 7 + optional UI Schema | **Forms only** (AJV validation) | Runtime | React / Angular / Vue; core is framework-agnostic | ~2.7k★, v3.8.x | MIT | Explicit draft support in docs ([JSON Schema concept](https://eclipsesource-jsonforms.mintlify.app/concepts/json-schema)); **no Svelte binding** |
| **[Uniforms](https://github.com/vazco/uniforms)** | JSON Schema, Zod, SimpleSchema, custom bridges | **Forms only** | Runtime | React; AntD/Bootstrap/MUI/Semantic/HTML | ~2.1k★ | MIT | Same library can take Zod or JSON Schema ([README](https://github.com/vazco/uniforms/blob/master/README.md)) |
| **[`@sjsf/form` / svelte-jsonschema-form](https://github.com/x0k/svelte-jsonschema-form)** | JSON Schema; validators include Ajv8, **Zod v4**, Valibot, Standard Schema | **Forms only** | Runtime | **Svelte 5**; themes daisyUI/Flowbite/Skeleton/shadcn-svelte | ~170★; npm `@sjsf/form` 3.x | MIT (+ Apache for RJSF-derived bits) | Unofficial RJSF port; strongest Svelte JSON Schema form option ([README](https://github.com/x0k/svelte-jsonschema-form/blob/main/README.md), [Zod v4 validator docs](https://x0k.github.io/svelte-jsonschema-form/validators/zod4/)) |
| **[react-admin `JsonSchemaForm`](https://marmelab.com/react-admin/JsonSchemaForm.html)** | JSON Schema (+ uiSchema) via RJSF | Form inside Edit/Create; **list/API are separate react-admin resources** | Runtime | React + Material; EE package `@react-admin/ra-json-schema-form` | react-admin ~26.9k★ (core MIT); this form is **Enterprise Edition** | EE (commercial) | Form-only plug-in; CRUD list + dataProvider are not generated from the schema ([docs](https://marmelab.com/react-admin/JsonSchemaForm.html)) |
| **[NextMin](https://nextmin.gscodes.dev/)** (`nextmin-node` / `nextmin-react`) | **Proprietary** PascalCase `*.json` models (`modelName`, `attributes`, `allowedMethods`, `access`)—**not** JSON Schema Draft | REST CRUD + auth policies + admin UI + file fields | Runtime (hot-reload schemas) | Next.js / Vite / Express; DB via NMAdapter | Product docs site; npm `@airoom/nextmin` not found under that name | Check package licenses on install | Full admin+API from JSON files; schema examples: [schema-examples](https://nextmin.gscodes.dev/docs/nextmin-node/schema-examples), [API](https://nextmin.gscodes.dev/docs/nextmin-node/api-examples) |
| **[autocrud-core](https://github.com/vaibhavr2107/autocrud)** (`autocrud-core` on npm) | Proprietary JSON (`name`, `fields`, PK, ops) | REST + GraphQL + function API; AJV validation; **no admin UI** | Runtime (+ hot reload) | Node 18+; file/SQLite/Postgres/Mongo adapters | ~1★ | Apache-2.0 | API CRUD only ([README](https://github.com/vaibhavr2107/autocrud/blob/main/README.md)) |
| **[Crouton](https://github.com/GhentCDH/crouton)** (`@ghentcdh/crouton-*`) | Proprietary `resource.json` (columns, operations); Zod used for validation | NestJS controllers + Vue tables/forms/filters | Runtime libraries (WIP) | NestJS + Vue 3 | 0★; npm alpha (`0.0.1-alpha.*`); docs warn unstable | MIT | Real project; **not** JSON Schema ([README](https://github.com/GhentCDH/crouton/blob/main/README.md), [docs](https://ghentcdh.github.io/crouton/)) |
| **[Laravel SchemaForge](https://github.com/Ekram-Muahammad/laravel-SchemaForge)** | Proprietary JSON table/field files | Migrations, models, controllers, CRUD **views**, API resources | **Codegen** (`php artisan make:crud`) | Laravel / Blade | ~27★ | Unclear on GitHub license field | Not JSON Schema vocabulary ([README](https://github.com/Ekram-Muahammad/laravel-SchemaForge)) |
| **[spring-crud-generator](https://github.com/mzivkovicdev/spring-crud-generator)** | YAML/JSON **CRUD spec** validated by project’s own JSON Schema file | Spring Boot entities, REST, optional GraphQL/OpenAPI/Flyway/security | **Codegen** (Maven plugin) | Java / Spring Boot | ~38★ | Apache-2.0 | Spec *has* a JSON Schema for validation; input is not “your domain JSON Schema” ([repo](https://github.com/mzivkovicdev/spring-crud-generator)) |
| **[rapid-crud-generator](https://github.com/xmyLydia/rapid-crud-generator)** | Custom nested type map in JSON | Spring Boot API + Angular admin zip | Codegen service | Spring + Angular | ~1★ | MIT | Hobby demo; schema shape is not Draft JSON Schema |
| **[crudsmith](https://github.com/myselfAbdullah007/crudsmith)** | Proprietary JSON model | Express/Mongoose model+controller+routes | CLI codegen | Node/Express/Mongo | Low | Check repo | API scaffolding only |
| **[FormKit Schema](https://formkit.com/essentials/schema)** | FormKit’s own JSON-serializable **UI** schema (`$formkit`, `$el`, …) | Forms (any markup) | Runtime | Vue / React FormKit | ~4.8k★ | MIT | Not JSON Schema; parallel vocabulary ([docs](https://formkit.com/essentials/schema)) |
| **Adminify / codehooks datamodel dashboards** | Ad-hoc JSON entity/datamodel files (sometimes nest a JSON Schema under `schema`) | Marketing “instant admin” / template CRUD | Product/template specific | React templates | Varies | Check each product | Treat as demos unless you adopt the whole host stack ([Adminify](https://v0-adminfy.vercel.app/), [codehooks](https://codehooks.io/react-admin-dashboard)) |

### Admin platforms that do **not** take Zod/JSON Schema as the driver

| Platform | Actual schema source | Zod / JSON Schema? |
| --- | --- | --- |
| **[AdminJS](https://docs.adminjs.co/)** | ORM adapters (Prisma, TypeORM, Sequelize, Mongoose, …) | **No** first-class Zod/JSON Schema resource API; Prisma adapter uses DMMF models ([Prisma adapter](https://docs.adminjs.co/installation/adapters/prisma)) |
| **[Directus](https://directus.io/docs/guides/data-model/collections)** | DB tables + Directus field metadata | **No** Zod input; third-party tools generate Zod *from* Directus (e.g. [zodirectus](https://github.com/InformationSystemsAgency/zodirectus))—direction reversed |
| **[Forest Admin](https://docs.forest.app/reference/schema/forestadmin-schema)** | Auto-generated `.forestadmin-schema.json` from data sources | Forest-owned format; **not** editable JSON Schema/Zod input |
| **[Refine](https://refine.dev/)** | Data providers + optional Inferencer from **API sample data**; AI/OpenAPI flows | Inferencer does **not** document Zod/JSON Schema as input ([Inferencer](https://refine.dev/core/docs/packages/inferencer/)); OpenAPI upload is a product builder path, not a Zod path ([REST connect](https://refine.dev/resources/integrations/rest-api/)) |

---

## Zod → CRUD options

| Tool | Input (primary) | Generates | Runtime vs codegen | Stack | Maturity | License | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **[AutoForm](https://autoform.vantezzen.io/)** (`@autoform/zod`, UI pkgs) | Zod (also Yup/Joi providers) | **Forms only**; docs position “simple admin panel” use as form drop-in | Runtime | React + RHF or TanStack Form; MUI/shadcn/Mantine/Ant/Chakra | ~3.5k★ | MIT | Explicitly **not** a full form builder/CRUD shell ([README](https://github.com/vantezzen/autoform/blob/main/README.md)) |
| **[Uniforms](https://github.com/vazco/uniforms)** | Zod bridge | **Forms only** | Runtime | React | ~2.1k★ | MIT | Same as JSON Schema row |
| **[`@wordrhyme/auto-crud`](https://www.npmjs.com/package/@wordrhyme/auto-crud)** | Zod schema + resource hooks | **Table + forms** CRUD UI; tRPC/REST/memory | Runtime | React; TanStack Table; Formily; peer `zod` | npm 1.5.x; monorepo ~0★ | MIT | Closest npm “Zod → list+form CRUD components”; you still implement persistence ([npm](https://www.npmjs.com/package/@wordrhyme/auto-crud)) |
| **[AutoAdmin](https://github.com/awecode/autoadmin)** | **Drizzle** for DB admin; **Zod** for JSON file resources (`schema` / `elementSchema`) | Full admin: list/search/filters, create/update/delete, uploads, rich text; JSON local / GitHub / R2|S3 | Runtime Nuxt layer | Nuxt + Nuxt UI + Drizzle + Zod | ~34★ | MIT | JSON Admin is the relevant CMS cousin ([json-admin.md](https://github.com/awecode/autoadmin/blob/main/docs/json-admin.md), [README](https://github.com/awecode/autoadmin/blob/main/README.md)) |
| **[KUI / `@kui-framework/*`](https://github.com/kennyjsa/kui)** | Custom `zKUI` Zod extensions | FormBuilder + DataTable; create/edit/view modes | Runtime | React + Radix/shadcn; REST/tRPC | ~0★ | MIT | Zod-shaped **DSL**, not plain Zod ([README](https://github.com/kennyjsa/kui/blob/develop/README.md)) |
| **[`@kitty-kit/crud-generator`](https://www.npmjs.com/package/@kitty-kit/crud-generator)** | Proprietary field config JSON | Emits Zod schema **plus** React page/hooks/store/table/modals | **Codegen CLI** | React / Zustand | npm 2.0.1 | MIT | Zod is an **output**, not the input ([npm](https://www.npmjs.com/package/@kitty-kit/crud-generator)) |
| **[autoform-svelte](https://github.com/Convex-Works/autoform-svelte)** | Zod adapter or JSON Schema adapter; `.meta({ form: … })` | **Forms only** | Runtime | **Svelte 5**; optional shadcn-svelte theme | ~10★ | Check repo | Direct Zod→Svelte forms ([README](https://github.com/Convex-Works/autoform-svelte/blob/main/README.md)) |
| **[svelte-jsonschema-form + Zod v4 validator](https://x0k.github.io/svelte-jsonschema-form/validators/zod4/)** | JSON Schema UI; Zod validates | **Forms only** | Runtime | Svelte 5 | ~170★ | MIT/Apache | Use when Astro emits JSON Schema but you want Zod validation |
| **[schema-dashboard](https://github.com/tysoncung/schema-dashboard)** | Zod (Pro: CLI generate) | Next.js CRUD pages (Free limited) | Template / Pro codegen | Next.js + shadcn + RHF | Marketing/free tier | Free/Pro | Hobby/commercial template; verify Pro claims on purchase page |
| **prisma-zod-generator + AdminJS/Refine** | Prisma schema → Zod types | Admin from Prisma, Zod for app validation | Mixed | Node | Mature pieces separately | Varies | Common pattern: **DB/ORM drives admin**; Zod is sibling validation—not “Zod drives CRUD” |

### Conversion utilities (enablers, not CRUD)

| Utility | Role |
| --- | --- |
| **Zod 4 [`z.toJSONSchema` / `z.fromJSONSchema`](https://zod.dev/json-schema)** | First-party; targets draft-2020-12 (default), draft-07, draft-04, openapi-3.0; `unrepresentable` / `io: 'input'` matter for editors (Astro uses `io: 'input'`, `unrepresentable: 'any'`) |
| **[`zod-to-json-schema`](https://www.npmjs.com/package/zod-to-json-schema)** | Community converter for Zod **v3** schemas (v3.25 peer can install Zod 4 package but still expects v3 schemas) |

---

## Gaps / what “full CRUD from schema alone” still needs

Even the best tools leave these as **application** concerns:

1. **Persistence model** — file tree vs DB vs GitHub Contents API; schema never implies path/slug/body conventions for Astro collections.
2. **List identity & routing** — primary key, slug, collection vs singleton, pagination filters.
3. **UI beyond validation** — widgets for markdown body, image upload/derivatives, blocks/layout, references between collections (see open threads in this folder).
4. **Auth / RBAC** — only full platforms (NextMin policies, AutoAdmin roles, Directus, Forest) own this; form libraries do not.
5. **Lossy Zod ↔ JSON Schema** — transforms, dates, custom types, and refinements do not round-trip cleanly ([Zod JSON Schema docs](https://zod.dev/json-schema)); form UIs often need **uiSchema / fieldConfig / `.meta()`** overlays.
6. **Codegen vs live** — codegen (kitty-kit, SchemaForge, spring-crud-generator) drifts from schema unless regenerated; runtime form engines stay in sync but still need a data layer.

**Honest bar:** “Full CRUD from schema alone” in the wild usually means either **ORM/DB introspection** or a **purpose-built resource DSL**. Pure Zod or pure JSON Schema almost always stops at **forms** (sometimes tables) unless you adopt a niche React/Nuxt library and wire storage yourself.

---

## Relevance for a content-CMS / Astro Zod collections authoring UI

| Approach | Fit for this product |
| --- | --- |
| **Keep Zod as SoT; render forms in Svelte** | Prefer **`autoform-svelte`** (direct Zod) or **`@sjsf/form`** on Astro’s generated JSON Schema + Zod validator. Aligns with [01](01-astro-schema-load-and-ui-metadata.md) enrichment via `.meta()` / registries. |
| **Convert Zod → JSON Schema → RJSF/JSON Forms** | Viable if shell were React/Vue; **JSON Forms has no Svelte**. RJSF is React-only. Conversion useful for shared tooling/tests, not as the primary Svelte path. |
| **Adopt AutoAdmin JSON Admin** | Conceptually closest to **git/local JSON file CRUD with Zod**—but stack is **Nuxt**, not Astro/Svelte; borrow patterns (object vs array resources, local/GitHub storage), not the dependency. |
| **Adopt NextMin / Crouton / autocrud** | Wrong schema dialect (proprietary JSON), wrong host assumptions (DB REST admins). Reject as runtime; maybe skim field catalogs for inspiration. |
| **AdminJS / Directus / Forest / Refine** | Wrong control plane for a **repo-local Astro authoring shell** (same leave-list as [02](02-prior-art-git-schema-cms.md)). They prove “admin from model,” not “admin from collection Zod.” |
| **`@wordrhyme/auto-crud`** | Good reference for **Zod → table+form** component API shape; React-only and immature GitHub presence—copy ideas, don’t import into a Svelte shell. |

**Practical architecture for this shell:** Zod (+ `.meta` UI hints) → Svelte field registry / form generator → existing write-back routes. Use JSON Schema only as an optional export/interop layer (already produced by Astro typegen), not as the exclusive CMS schema language. Expect to implement **list + delete + collection discovery** in-product; no primary-source tool hands you Astro content-collection CRUD end-to-end.

---

## Sources

### Form / schema engines
- RJSF: [GitHub](https://github.com/rjsf-team/react-jsonschema-form), [docs](https://rjsf-team.github.io/react-jsonschema-form/docs/), [JSON Schema section](https://rjsf-team.github.io/react-jsonschema-form/docs/json-schema/)
- JSON Forms: [site](https://jsonforms.io/), [intro](https://eclipsesource-jsonforms.mintlify.app/introduction), [JSON Schema drafts](https://eclipsesource-jsonforms.mintlify.app/concepts/json-schema)
- Uniforms: [GitHub README](https://github.com/vazco/uniforms/blob/master/README.md)
- AutoForm: [site](https://autoform.vantezzen.io/), [GitHub README](https://github.com/vantezzen/autoform/blob/main/README.md), [`@autoform/zod` npm](https://www.npmjs.com/package/@autoform/zod)
- svelte-jsonschema-form: [GitHub](https://github.com/x0k/svelte-jsonschema-form), [Zod v4 validator](https://x0k.github.io/svelte-jsonschema-form/validators/zod4/), [`@sjsf/form` npm](https://www.npmjs.com/package/@sjsf/form)
- autoform-svelte: [GitHub](https://github.com/Convex-Works/autoform-svelte)
- FormKit Schema: [docs](https://formkit.com/essentials/schema)
- react-admin JsonSchemaForm: [docs](https://marmelab.com/react-admin/JsonSchemaForm.html)

### Zod ↔ JSON Schema
- Zod: [JSON Schema](https://zod.dev/json-schema)
- zod-to-json-schema: [npm](https://www.npmjs.com/package/zod-to-json-schema), [GitHub](https://github.com/StefanTerdell/zod-to-json-schema)

### Zod-oriented CRUD / admin
- `@wordrhyme/auto-crud`: [npm](https://www.npmjs.com/package/@wordrhyme/auto-crud)
- AutoAdmin: [GitHub](https://github.com/awecode/autoadmin), [JSON admin](https://github.com/awecode/autoadmin/blob/main/docs/json-admin.md)
- KUI: [GitHub](https://github.com/kennyjsa/kui)
- `@kitty-kit/crud-generator`: [npm](https://www.npmjs.com/package/@kitty-kit/crud-generator)
- schema-dashboard: [GitHub](https://github.com/tysoncung/schema-dashboard)

### Proprietary JSON → API/admin
- NextMin: [home](https://nextmin.gscodes.dev/), [schema examples](https://nextmin.gscodes.dev/docs/nextmin-node/schema-examples), [API examples](https://nextmin.gscodes.dev/docs/nextmin-node/api-examples)
- autocrud: [GitHub README](https://github.com/vaibhavr2107/autocrud/blob/main/README.md)
- Crouton: [GitHub](https://github.com/GhentCDH/crouton), [docs](https://ghentcdh.github.io/crouton/)
- SchemaForge: [GitHub](https://github.com/Ekram-Muahammad/laravel-SchemaForge)
- spring-crud-generator: [GitHub](https://github.com/mzivkovicdev/spring-crud-generator)
- rapid-crud-generator: [GitHub](https://github.com/xmyLydia/rapid-crud-generator)
- crudsmith: [GitHub](https://github.com/myselfAbdullah007/crudsmith)

### Admin platforms (contrast)
- AdminJS Prisma: [docs](https://docs.adminjs.co/installation/adapters/prisma)
- Directus collections: [docs](https://directus.io/docs/guides/data-model/collections)
- Forest schema file: [docs](https://docs.forest.app/reference/schema/forestadmin-schema)
- Refine Inferencer: [docs](https://refine.dev/core/docs/packages/inferencer/); OpenAPI builder: [REST integration](https://refine.dev/resources/integrations/rest-api/)
- zodirectus (Directus → Zod): [GitHub](https://github.com/InformationSystemsAgency/zodirectus)

### Related in-repo research
- [01-astro-schema-load-and-ui-metadata.md](01-astro-schema-load-and-ui-metadata.md) — Astro Zod + `.schema.json` emission
- [02-prior-art-git-schema-cms.md](02-prior-art-git-schema-cms.md) — Keystatic/Tina/Decap/Pages as product cousins (custom field schemas, not JSON Schema/Zod engines)
