# JS/TS libraries: editorial hooks + CRUD / collection abstraction

**Date:** 2026-09-22 · **updated 2026-09-22 — deepened/widened**  
**Question:** Across the JS/TS ecosystem — thin hook buses, client collection stores, ORM lifecycle hooks, CMS frameworks, BaaS products, authz filter languages, typed API layers, and FS/KV storage adapters — which pieces help with (1) editorial / lifecycle hooks (`beforeSave`, `afterValidate`, middleware-style write pipelines) and/or (2) abstracting CRUD / collections / queryable local-or-remote data stores? How do they map to Astro Dev CMS’s protocol + FS-first adapter stack **without** changing product identity (backend-agnostic authoring UI ↔ CMS protocol ↔ host/adapters; no “become a real backend”)?  
**Method:** Primary sources only (official docs, GitHub READMEs, package docs, first-party API references). Every factual claim below cites a source URL. Fit scoring uses in-repo product constraints for context only.  
**Honesty bar:** Prefer “composition of known pieces” over claiming a drop-in PocketBase substitute in TypeScript. Call out IndexedDB / sync-engine / React / hosted-control-plane assumptions. Do not invent APIs. Mark expansions relative to the first pass.

**Product fit baseline (not identity change):** backend-agnostic authoring UI ↔ serializable CMS protocol ↔ host/adapters; FS adapter first; needs editorial lifecycle, not necessarily a full BaaS; user likes PocketBase’s programmatic shape but does not want to own “becoming a real backend.” Sources: [CONTEXT.md](../../CONTEXT.md), [AGENTS.md](../../AGENTS.md), [docs/adr/0008-backend-agnostic-ui-fs-first-adapter.md](../adr/0008-backend-agnostic-ui-fs-first-adapter.md), [docs/adr/0005-write-back-contract.md](../adr/0005-write-back-contract.md), [docs/adr/0014-working-tree-is-the-local-draft.md](../adr/0014-working-tree-is-the-local-draft.md).

---

## 1. What PocketBase packages that people actually want

When people say “I want PocketBase’s API,” they usually mean a **bundled product surface**, not one npm package. From PocketBase’s own docs, that surface is at least:

| Capability | What PocketBase documents | Source |
| --- | --- | --- |
| Collection CRUD + query | Programmatic `$app.findRecordById`, `findRecordsByFilter`, `save`, `delete`, `runInTransaction`, etc. | [Record operations](https://pocketbase.io/docs/js-records/) |
| Middleware-style lifecycle hooks | `onRecordCreateRequest` / `onRecordUpdateRequest` / `onRecordAfterUpdateSuccess` / … with `e.next()` chain | [Event hooks](https://pocketbase.io/docs/js-event-hooks/), [JS overview](https://pocketbase.io/docs/js-overview/) |
| Access rules co-located with collections | `listRule` / `viewRule` / `createRule` / `updateRule` / `deleteRule` filter expressions | [API rules and filters](https://pocketbase.io/docs/api-rules-and-filters/) |
| Realtime + auth + file storage | Built into the same executable (product packaging, not surveyed deeply here) | PocketBase product docs overall |

Important packaging detail: server hooks run in PocketBase’s **embedded goja JSVM** (`pb_hooks/*.pb.js`), not as a portable Node/Bun library you drop into an Astro host. Handlers are isolated programs; there is no Node `fs`/`fetch` unless rebound. Sources: [JS overview](https://pocketbase.io/docs/js-overview/), [JSVM Hook interface](https://pocketbase.io/jsvm/interfaces/hook.Hook.html).

**Stress-test of “nothing exists”:** pieces exist separately in the JS/TS ecosystem (hook buses, collection clients, sync engines, CMS frameworks, ORM lifecycle, FS/KV drivers). What is scarce is a **single extractable library** that is simultaneously:

1. typed collection CRUD over pluggable storage,
2. CMS-style `beforeValidate` / `beforeSave` / `afterChange` chains,
3. declarative collection rules,
4. **without** owning a hosted control plane or requiring IndexedDB/sync as the source of truth.

That scarcity is real. “Nothing exists” is still wrong if the question is softer: *reusable building blocks for (1) and/or (2)*.

---

## 2. Category map

| Library / product | Category | Editorial / lifecycle hooks? | Collections / CRUD / query? | Adapter-friendly / not a hosted control plane? | Runtime assumptions (high signal) |
| --- | --- | --- | --- | --- | --- |
| **TanStack DB** | Client reactive store + collection adapters | Mutation handlers `onInsert`/`onUpdate`/`onDelete`; `createOptimisticAction`; `createPacedMutations` (debounce/throttle/queue); not CMS `beforeValidate` stages | Yes: collections, live queries, optimistic CRUD | Yes for QueryCollection → your API/protocol; sync collections pull in engines | Client store; React/Svelte/etc adapters; optional Electric/PowerSync/RxDB |
| **RxDB** | Offline-first document DB | First-class `preInsert`/`preSave`/`postSave`/… middleware; throw-to-abort | Yes: `RxCollection` CRUD + queries | Storage-pluggable (incl. Node FS / Mongo / DenoKV) | Often IndexedDB; **can** run server-side with non-browser storages |
| **ElectricSQL** | Postgres → client sync (shapes) | No editorial hook API (sync client) | Shape streams / materialised shapes; writes via your API | Sync service over your Postgres; not a CMS | Needs Electric + Postgres shape HTTP |
| **PowerSync** | Offline SQLite sync | Backend connector upload path, not CMS hooks | Local SQLite + sync rules | Connector pattern; you still own backend | SQLite client SDKs |
| **LiveStore** | Event-sourced local store + sync | Materializers map events → state (not `beforeSave`) | SQLite state + reactive queries | Eventlog is source of truth — high product commitment | Client eventlog / SQLite |
| **InstantDB** | Hosted local-first BaaS | Permissions rules (CEL), not in-process write hooks | `db.tx` / InstaML CRUD + queries | Hosted Instant backend | Instant cloud + client SDK |
| **Triplit** | Full-stack sync DB | Schema + client mutators; sync server | Typed collections, insert/update/delete/fetch | Self-host server possible; still “be the DB” | Client + Triplit server |
| **Jazz** | Local-first relational + sync | Row-level permissions; local writes | Tables, subscribe, insert | Jazz sync/server story | Local replica + sync |
| **Replicache** | Sync engine (mutators) | Shared client/server mutators | Key/value oriented datastore | You implement push/pull backend | Browser client + custom server |
| **TinyBase** | Reactive in-memory store | Listeners / transactions; not CMS lifecycle | Tables + values; optional persistence/sync | Thin store; good glue | In-memory first |
| **WatermelonDB** | Lazy SQLite for RN/web | Model `@writer` / sync; not Payload-style hooks | Models + observables | Sync with your backend | SQLite; React-oriented |
| **Dexie** | IndexedDB wrapper | CRUD hooks `creating`/`reading`/`updating`/`deleting` | Tables + queries | Browser IndexedDB | IndexedDB |
| **PocketBase** | Embedded BaaS | Rich `onRecord*` hooks + rules | Full record CRUD | **Is** the backend executable | goja hooks / SQLite server |
| **Appwrite** | BaaS | Functions on platform **events** (after-the-fact) | Databases/tables SDK | Hosted/self-host platform | Platform events / containers |
| **Supabase** | Postgres BaaS | DB triggers / Edge Functions (platform) | PostgREST client | Hosted Postgres product | Postgres + platform |
| **Convex** | Hosted reactive backend | Mutations/actions as the write API | Document tables + queries | Hosted Convex | Convex cloud functions |
| **Firebase** | Hosted BaaS | Cloud Functions triggers | Firestore/RTDB SDKs | Hosted Google control plane | Firebase project |
| **Payload** | Headless CMS framework | `beforeValidate` / `beforeChange` / `afterChange` / … | Collections via Payload | **Not** extractable as a thin lib | Next/Payload server |
| **Keystone** | Headless CMS framework | `resolveInput` / `validate` / `beforeOperation` / `afterOperation` | Lists via Keystone/Prisma | Not extractable | Keystone GraphQL server |
| **Directus** | Headless CMS / data platform | Extension **hooks** (`filter`/`action`) + Flows | Collections via Directus | Process-bound extensions | Directus process |
| **Strapi** | Headless CMS | Model `beforeCreate`/`afterUpdate`/… lifecycles | Content-types via Strapi | Not extractable | Strapi server |
| **Sanity** | Hosted content platform | Studio **document actions** + Content Lake webhooks/actions — not in-process `beforeSave` | Documents via Content Lake | Hosted Content Lake | Sanity project / Studio |
| **Kirby** | PHP file CMS | `page.create:before` / `page.update:after` / … plugin hooks | Pages/files on disk | PHP Kirby app (pattern steal only) | PHP runtime |
| **Decap CMS** | Git-backed CMS UI | **Editorial workflow** = Git PR stages, not write middleware | Entries via Git backends | Git is the backend | Browser admin + Git provider |
| **TinaCMS** | Git-backed CMS + GraphQL Content API | Auth/content wrappers around GraphQL/data layer; not Payload-style stages | Collections via Tina schema + Content API | Local FS GraphQL or TinaCloud | Tina CLI / Cloud / self-host data layer |
| **Keystatic** | Git/local content CMS | Reader API (Node); no documented CMS hook bus | Collections/singletons via reader | Local dir or GitHub reader | Node (not browser) |
| **hookable** | Thin hook bus | Named awaitable hooks (`callHook` sequential); throw rejects | No | Extremely adapter-friendly | None |
| **tapable** | Plugin hook system | Sync/async; **bail** + **waterfall** hook classes | No | Extremely adapter-friendly | None |
| **Zod / Effect Schema / Standard Schema** | Validation / transform pipelines | Parse/transform stages, not editorial events | No (schema only) | Adapter-friendly | None |
| **CASL** | Isomorphic authorization | Ability checks, not write lifecycle | No (can filter arrays) | Adapter-friendly | None |
| **OPA / OpenFGA / Permit.io** | Externalized authz | Policy / relationship checks | No | Policy engines — you still own storage | Sidecar / SaaS / SDK |
| **tRPC / oRPC / ts-rest / Eden** | Typed RPC / OpenAPI layers | Procedure middleware; not collections | You define routers | You own adapters | Server procedure runtime |
| **Effect Layer / services** | Effect DI / composition | Architectural substitute for “app” wiring | You build repositories | Adapter-friendly if kept thin | Effect runtime |
| **Prisma `$extends`** | ORM query/result extensions | Query middleware (`query` → `query(args)`), not CMS stages | Models via Prisma | ORM-bound | Prisma Client + DB |
| **Drizzle** | SQL ORM | **No** general lifecycle hooks; logger / proxy / cache `onMutate` only | Tables via Drizzle | SQL driver | SQL DB |
| **TypeORM** | ORM | Entity listeners + subscribers (`@BeforeInsert`, …) | Repositories | ORM-bound | TypeORM + DB |
| **MikroORM** | ORM | Entity hooks + EventSubscriber + flush/tx events | EntityManager | ORM-bound | MikroORM + DB |
| **Mongoose** | ODM (historical template) | Classic `pre`/`post` `save`/`validate`/`remove` middleware | Models / documents | Mongo-bound | MongoDB |
| **unstorage** | Unified KV + drivers | No editorial stages; driver CRUD | `get`/`set`/`remove`/… over FS/KV/DB/cloud | **Strong** FS/KV adapter pattern | Driver-dependent |
| **SignalDB** | Reactive local DB | SyncManager pull/push; not CMS stages | Mongo-like local collections | Local-first; sync optional | Browser/local + your API |
| **Legend-State** | Signal state + sync/persist | Sync plugins / `syncedCrud`; not CMS stages | Observables (CRUD-ish via plugins) | Thin if local-only | Often React; persist plugins |
| **LokiJS** | In-memory JS DB | Collection events (historical); in-memory first | Collections + DynamicViews | In-memory / optional persist | Browser/Node |
| **LowDB** | JSON file DB | No hook bus | `read`/`write`/`update` over adapters | Thin FS JSON store | Node/browser adapters |
| **conf / electron-store** | App config stores | No editorial hooks | Key/value config persistence | App-config only | Node/Electron |
| **@tanstack/store / zustand / nanostores** | UI state | No collection CRUD claims | Atom/store state | UI-only | Framework UI |
| **SurrealDB JS / Turso libSQL** | Embedded/remote SQL | Surreal live queries / events (DB product); Turso = SQLite client | SQL collections/tables | Embedded SQL alternative to PocketBase SQLite | Surreal / libSQL runtime |
| **Yjs / Automerge / Loro** | CRDT collaboration | Merge semantics ≠ write hooks | Shared docs, not CMS entries | Fight FS drafts unless CRDT is SoT | Collaborative editing |
| **Koa / Nest pipes-interceptors / Hono** | Server middleware patterns | Onion / interceptor / pipe around **requests** (steal for domain ops) | No | Pattern only | HTTP server |
| **Command bus / mediator** | Application service wiring | Handler pipeline; you invent stages | Commands ≠ collections | Thin if you own handlers | DI container optional |

---

## 3. Deep dive: TanStack DB *(expanded)*

### 3.1 What it is

Official positioning: **“the reactive client store for your API.”** It extends TanStack Query with:

- **collections** — typed sets of objects loaded from REST, sync engines, or local state,
- **live queries** — reactive, incremental queries (differential dataflow via d2ts),
- **optimistic mutations** — `insert` / `update` / `delete` with persistence handlers.

Source: [TanStack DB overview](https://tanstack.com/db/latest/docs/overview).

It is **not** marketed as a CMS, BaaS, access-rules engine, or filesystem write-back layer.

### 3.2 Collections and sync

Built-in collection types documented in the overview:

| Kind | Examples |
| --- | --- |
| Fetch | **QueryCollection** (TanStack Query → REST/any `queryFn`) |
| Sync | **ElectricCollection**, **TrailBaseCollection**, **RxDBCollection**, **PowerSyncCollection** |
| Local | **LocalStorageCollection**, **LocalOnlyCollection** |

Sync modes: **eager**, **on-demand** (query-driven subset loads), **progressive**. Source: [overview](https://tanstack.com/db/latest/docs/overview).

Custom collection types are explicitly supported by implementing the collection interface / **collection options creator** pattern. Source: [overview — Creating Custom Collection Types](https://tanstack.com/db/latest/docs/overview), [Collection Options Creator](https://tanstack.com/db/latest/docs/guides/collection-options-creator).

#### QueryCollection vs LocalOnly *(new)*

| | **QueryCollection** | **LocalOnly** |
| --- | --- | --- |
| Persistence | Your backend via `queryFn` + `onInsert`/`onUpdate`/`onDelete` | In-memory only (no cross-session persist) |
| Mutation model | Handlers persist to API; optimistic overlay until sync/refetch | Direct local mutate; handlers optional “before confirm” |
| Best for CMS shell | Wrapping CMS protocol list/get/write | Session UI state, form drafts that must **not** be SoT |
| Docs | [Query Collection](https://tanstack.com/db/latest/docs/collections/query-collection) | [LocalOnly Collection](https://tanstack.com/db/latest/docs/collections/local-only-collection) |

**Can collection options creators wrap an arbitrary protocol?** Yes — that is the documented purpose of the collection options creator / custom collection path: implement load + mutation handlers against whatever API you own. Source: [Collection Options Creator](https://tanstack.com/db/latest/docs/guides/collection-options-creator). For Astro Dev CMS, that API is the serializable CMS protocol, not FS paths ([ADR-0005](../adr/0005-write-back-contract.md)).

### 3.3 Mutations (closest thing to “hooks”) *(expanded)*

Documented lifecycle for collection mutations:

1. Optimistic state applied locally  
2. Handler invoked (`onInsert` / `onUpdate` / `onDelete`, or custom `mutationFn` / `createTransaction`)  
3. Handler persists to backend  
4. Handler optionally waits for sync/refetch settlement  
5. Optimistic state dropped / reconciled; rollback on handler error  

Source: [Mutations guide](https://tanstack.com/db/latest/docs/guides/mutations).

This is a **persistence adapter callback**, not a multi-stage editorial pipeline (`resolveInput` → `validate` → `beforeOperation` → write → `afterOperation`). There is no documented first-class `beforeValidate` / `afterValidate` / rule filter language.

#### `createOptimisticAction` *(new)*

Intent-based mutations: `onMutate` applies optimistic local changes immediately; `mutationFn` persists; docs stress that `mutationFn` must wait until server writes have synced (e.g. `collection.utils.refetch()`) before returning, because optimistic state is dropped on return. Source: [Mutations — Creating Custom Actions](https://tanstack.com/db/latest/docs/guides/mutations), [createOptimisticAction reference](https://tanstack.com/db/latest/docs/reference/functions/createOptimisticAction).

Useful for multi-collection intents (e.g. “like post”) that are not raw CRUD. Still not editorial stages.

#### `createTransaction` *(new)*

Manual transactions: batch mutations, custom commit workflows, multi-step user interactions (`autoCommit: false`). Source: [Mutations — Manual Transactions](https://tanstack.com/db/latest/docs/guides/mutations).

#### `createPacedMutations` — autosave-relevant *(new, high signal)*

Powered by TanStack Pacer. Optimistic `onMutate` runs immediately; **strategy** controls when `mutationFn` persists:

| Strategy | Behavior | Documented best for |
| --- | --- | --- |
| `debounceStrategy` | Wait for inactivity; only final merged state persists | **Auto-save forms**, search-as-you-type |
| `throttleStrategy` | Minimum spacing; merge between executions | Sliders, progress |
| `queueStrategy` | Each mutation its own tx; sequential; all attempted | Uploads, ordered workflows |

`createPacedMutations` lives in `@tanstack/db` (framework-agnostic); React also has `usePacedMutations`. Each call site / instance owns its own queue — share one instance for shared debounce. Source: [Mutations — Paced Mutations](https://tanstack.com/db/latest/docs/guides/mutations), [createPacedMutations](https://tanstack.com/db/latest/docs/reference/functions/createPacedMutations).

**ADR-0014 implication:** the ADR already says the authoring UI “validates for responsive feedback, and **coalesces writes**,” then authoritative validate + atomic replace on the host. `debounceStrategy` is the closest surveyed library primitive to that coalescing client seam — but revision guards, atomic FS replace, and “invalid browser state must not replace canonical content” remain **host/adapter** responsibilities ([ADR-0014](../adr/0014-working-tree-is-the-local-draft.md)). See §12.

### 3.4 Schemas — validation timing *(expanded)*

Standard Schema compatible (Zod, Valibot, ArkType, Effect). **Important official caveat:** schemas validate **client mutations** entering the collection (`insert`/`update`); synced/server-loaded data is **not** automatically validated unless you parse in `queryFn` / sync ingest. Source: [Schemas guide](https://tanstack.com/db/latest/docs/guides/schemas) (“Schemas validate client changes only”).

Transforms/defaults (TInput → TOutput) are supported. Invalid inserts throw `SchemaValidationError`.

### 3.5 Query / offline

- Live queries are the query story (joins across collections, derived collections). Source: [Live queries](https://tanstack.com/db/latest/docs/guides/live-queries), [overview](https://tanstack.com/db/latest/docs/overview).  
- Offline / durable local persistence comes from **sync collection backends** (RxDB, PowerSync, Electric shapes, etc.), not from TanStack DB alone as a local database product. Source: collection types list in [overview](https://tanstack.com/db/latest/docs/overview).

### 3.6 Framework bindings — Svelte adapter limits *(expanded)*

First-party adapters include React and **Svelte** (`@tanstack/svelte-db`, `DbProvider`, `useLiveQuery`, `useLiveInfiniteQuery`). Source: [Svelte adapter](https://tanstack.com/db/latest/docs/framework/svelte/overview).

Observed limits from the same docs:

- Svelte 5 runes-style reactive getters (`query.data`, `query.isLoading`) — Svelte 5 oriented.  
- `usePacedMutations` is documented primarily under the **React** mutations guide; core `createPacedMutations` from `@tanstack/db` is the portable path for Svelte/authoring-session code.  
- Query identity / `queryKey` rules for opaque `.fn.where` closures — same IR model as React.

### 3.7 Fit for Astro Dev CMS (protocol / FS-first editorial lifecycle)

| Need | TanStack DB fit | Notes |
| --- | --- | --- |
| (a) Typed collections CRUD abstraction over protocol | **Strong** | QueryCollection (or custom collection) can wrap CMS protocol list/get/write; `onInsert`/`onUpdate`/`onDelete` map cleanly to protocol writes |
| (b) Mutation lifecycle hooks like Payload/PocketBase | **Weak–partial** | Persistence handlers ≠ staged editorial hooks; compose Zod/IR validation + your own hook bus around writes |
| (c) Stay adapter-friendly / avoid hosted control plane | **Strong** if you stay on QueryCollection/custom → existing `/_cms` / FS adapter | Weakens if you adopt Electric/PowerSync/RxDB as new sources of truth |
| Optimistic UI for authoring | **Good match** | Explicit optimistic overlay model |
| Debounced autosave coalescing | **Strong client seam** | `createPacedMutations` + `debounceStrategy` |
| Working-tree / revision-guarded FS drafts | **Out of band** | Still host/adapter responsibility (ADR-0014); DB won’t invent atomic FS writes |
| Svelte authoring shell | **Supported** | Official Svelte adapter; use core paced APIs outside React |

**Verdict:** TanStack DB is the strongest *surveyed* answer to “collections + queryable client store + pluggable write-back” without forcing a BaaS. It does **not** replace PocketBase hooks+rules. Suspicions that “nothing exists” are wrong for the **client collection layer**; still right for **PocketBase-in-a-library**.

---

## 4. hookable vs tapable vs custom *(expanded)*

| | **hookable** | **tapable** | **Custom typed map** |
| --- | --- | --- | --- |
| Origin | Extracted from Nuxt; unjs | Webpack plugin system | Your `Record<Stage, Handler[]>` |
| Call model | `callHook(name, …)` **sequential** await | Per-hook class: sync/async, parallel, series | Whatever you write |
| Bail / abort | Throw → `callHook` **rejects** (v5+) | **`SyncBailHook` / `AsyncSeriesBailHook`** — return non-undefined to stop | Easy to add |
| Waterfall (transform pipeline) | Not built-in; use `callHookWith` custom caller | **`SyncWaterfallHook` / `AsyncSeriesWaterfallHook`** | Easy to add |
| Typed hook maps | `Hookable<Hooks>` / `createHooks<T>()` | Per-hook instance typing | Best if stages are a closed union |
| Bundle | Very small; `HookableCore` for smaller footprint | Larger (many hook classes) | Zero / yours |
| CMS-ish usage | Nuxt / Nitro / unjs ecosystem (host tooling) | Webpack, Rspack, many bundler plugins — **not** CMS products | Payload/Keystone invent their own |

Sources: [unjs/hookable README](https://github.com/unjs/hookable), [npm hookable](https://www.npmjs.com/package/hookable), [webpack/tapable README](https://github.com/webpack/tapable).

**Editorial abort:** For “plugin may cancel save,” you need either throw-to-reject (hookable), bail hooks (tapable), or PocketBase-style “don’t call `next()`” (see §7). Payload/Keystone typically **throw** or report validation errors rather than bail hooks. If you want waterfall transforms (`resolveInput`-style), tapable’s waterfall classes or a 10-line custom reducer are honest; hookable alone is a bus, not a transform pipeline.

**Who uses them in CMS-ish code:** CMS frameworks (Payload, Keystone, Directus, Strapi, Kirby) roll **their own** stage registries — they do not publish extractable hookable/tapable wrappers. hookable shows up in **meta-framework host** stacks (Nuxt); tapable in **bundlers**. Steal the *stage names*, not the framework process.

---

## 5. RxDB / Dexie middleware *(expanded)*

### 5.1 RxDB — exact hooks + abort

| Hook | When (documented) |
| --- | --- |
| `preInsert` / `postInsert` | Around insert; validation runs **after** `preInsert` series+parallel |
| `preSave` / `postSave` | Around document save |
| `preRemove` / `postRemove` | Around remove |
| `postCreate` | When `RxDocument` instance is constructed (sync only) |

Series vs parallel flag on each registration. **Abort:** throw an error in a hook to stop the operation. **No validate-hook:** field-level validation on every change; mongoose-style validate hooks intentionally omitted. Source: [RxDB middleware](https://rxdb.info/middleware.html).

### 5.2 Node vs browser — can RxDB be a host adapter?

RxDB’s **RxStorage** layer is pluggable. Official storage list includes browser (LocalStorage, Dexie, IndexedDB, OPFS) **and** server-oriented options: **Filesystem Node**, **MongoDB**, **DenoKV**, **FoundationDB**, SQLite (premium), etc. Source: [RxStorage](https://rxdb.info/rx-storage.html).

So: RxDB *can* run in a Node/Bun host process with a non-IndexedDB storage. That still makes RxDB (or its storage files/Mongo) the content store — **not** Astro `src/content/` JSON as canonical — unless you build a custom storage that writes protocol/FS-shaped files (non-trivial; not documented as a first-class CMS adapter).

### 5.3 Dexie — exact hooks

Dexie documents CRUD hooks: `creating`, `reading`, `updating`, `deleting` (plus `populate` on DB create). Designed for IndexedDB change tracking / addons. Source: [Dexie Design — CRUD Hooks](https://dexie.org/docs/Tutorial/Design), [Table.hook()](https://dexie.org/docs/Table/Table.hook()).

**Fit:** excellent browser DB toolkit; wrong default SoT for Astro content collections on disk.

---

## 6. CMS / file-CMS editorial stage vocabularies *(expanded tables)*

Steal patterns only. **None** of these are extractable libraries for a protocol host.

### 6.1 Payload — collection hooks

| Hook | When it fires (docs) |
| --- | --- |
| `beforeOperation` | Before operation begins; can modify args |
| `beforeValidate` | Create/update; format data **before** server-side validation |
| `beforeChange` | Create/update; immediately before validation; data still unvalidated user input |
| `afterChange` | After create/update persistence |
| `beforeRead` / `afterRead` | Around find / findByID output |
| `beforeDelete` / `afterDelete` | Around delete |
| `afterOperation` | After operation completes; can modify result |
| `afterError` | On errors |
| Auth-only | `beforeLogin`, `afterLogin`, `afterLogout`, `refresh`, `me`, … |

Source: [Payload collection hooks](https://payloadcms.com/docs/hooks/collections), [Hooks overview](https://payloadcms.com/docs/hooks/overview).

### 6.2 Keystone — list/field hooks

Order for create/update: **`resolveInput` → `validate` → `beforeOperation` → DB (Prisma) → `afterOperation`**. Fields first (parallel), then list. `validate` uses `addValidationError(msg)` (preferred over throw for multi-error). Source: [Keystone hooks](https://keystonejs.com/docs/config/hooks).

### 6.3 Directus — extension hooks

| Register | Semantics |
| --- | --- |
| `filter` | **Before** emit; can modify payload / prevent |
| `action` | **After** emit; side effects |
| `init` / `schedule` / `embed` | App lifecycle / cron / Studio inject |

Item events include `items.create` / `items.update` / `items.delete` / `items.read` / `items.query` (and collection-scoped variants). Source: [Directus Event Hooks](https://directus.com/docs/guides/extensions/api-extensions/hooks).

### 6.4 Strapi — model lifecycles

`beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`, plus `*Many` and find/count variants; `event.params` / `event.result` / shared `event.state`. Source: [Strapi models — lifecycle hooks](https://docs.strapi.io/cms/backend-customization/models#lifecycle-hooks).

### 6.5 Sanity — not the same shape

- **Studio:** customize **document actions** (`publish`, `delete`, …) via `document.actions` / `useDocumentOperation` — UI operation menu, not server `beforeValidate`. Sources: [Document Actions](https://www.sanity.io/docs/studio/document-actions), [Document Actions API](https://www.sanity.io/docs/studio/document-actions-api).  
- **Content Lake:** webhooks on create/update/delete; Actions API for programmatic mutate/publish. Sources: [Webhooks](https://www.sanity.io/docs/content-lake/webhooks), [Dispatch actions](https://www.sanity.io/docs/content-lake/dispatch-actions).

### 6.6 Kirby — PHP file CMS (pattern)

`before` / `after` hooks named like `page.delete:before`, `page.create:after`; throw Exception to fail; wildcards supported. Hooks can run from Panel, CLI, or scripts. **Not JS** — vocabulary reference only. Source: [Kirby hooks](https://getkirby.com/docs/reference/plugins/extensions/hooks).

### 6.7 Decap — editorial workflow ≠ hooks

`publish_mode: editorial_workflow` maps UI actions to Git: save draft → branch + PR; edit → commit; approve → merge. Not an in-process middleware chain. Source: [Decap Editorial Workflows](https://decapcms.org/docs/editorial-workflows/).

### 6.8 TinaCMS — Content API / data layer

Git (Markdown/JSON) remains SoT; GraphQL Content API + optional data layer (bridge + index DB) for query/edit performance; local filesystem Content API in dev. Auth wrappers exist for Cloud/self-host — **not** a documented Payload-style stage list. Sources: [Tina Content API overview](https://tina.io/docs/features/data-fetching), [Data Layer](https://tina.io/docs/reference/content-api/data-layer).

### 6.9 Keystatic — reader (writer undocumented here)

Official **Reader API**: `createReader` / `createGitHubReader` — `collections.*.list|read|all`, `singletons.*.read`; **Node only**, not browser. No first-class hook bus found in reader docs. Source: [Keystatic Reader API](https://keystatic.com/docs/reader-api). (A dedicated Writer API doc URL was not available at research time; treat writes as Keystatic-app territory unless a first-party writer doc is confirmed.)

### 6.10 Extractability summary

| Product | Extract stage names? | Extract as npm dependency? |
| --- | --- | --- |
| Payload / Keystone / Directus / Strapi | **Yes** | **No** |
| Kirby | Yes (rename to JS) | No (PHP) |
| Sanity / Decap / Tina / Keystatic | Partial / different metaphor | No (platform or app) |

---

## 7. PocketBase — goja hooks → portable stage model *(expanded)*

### 7.1 Chain mechanics (goja-bound)

- Handlers share `function(e){}`; **must call `e.next()`** to continue.  
- Throw **or** omit `e.next()` → stops chain.  
- Before/`after` relative to `e.next()` matter (DB access rules differ before vs after).  

Source: [JS event hooks](https://pocketbase.io/docs/js-event-hooks/).

### 7.2 Record write-related hooks (concept-portable names)

Approximate create path from docs: `onRecordCreate` → `onRecordValidate` (skipped with `saveNoValidate`) → `onRecordCreateExecute` → success/error after hooks. Request-level hooks (`onRecordCreateRequest`, etc.) wrap HTTP/API entry. Enrichment: `onRecordEnrich`. Full list is large — see the same page for Update/Delete mirrors (`onRecordUpdate*`, `onRecordDelete*`, `onRecordAfter*Success/Error`).

| PocketBase (goja) | Portable concept | goja-bound? |
| --- | --- | --- |
| `e.next()` onion | Middleware composition | **Yes** (API shape) |
| `onRecordValidate` | `validate` stage | Concept portable |
| Before `next` on Create/Update | `beforeWrite` / resolve input | Concept portable |
| `onRecordCreateExecute` | Immediate pre-persist | Concept portable |
| `onRecordAfterCreateSuccess` | `afterWrite` committed | Concept portable |
| `onRecord*Request` | Protocol/HTTP edge hooks | Portable as “request” vs “model” |
| `$app` record APIs / transactions | Collection CRUD service | Concept portable; impl is PB |
| API rules filter DSL | Declarative authz | **Product-bound** (PB parser) |
| `pb_hooks` isolation / no Node fs | Hook runtime packaging | **goja-bound** |

---

## 8. Validation pipelines *(expanded)*

| Tool | Role | Pipeline? | Source |
| --- | --- | --- | --- |
| **Zod** | Parse + transforms (`.transform`, pipes) | Schema pipeline, not mutation middleware | [Zod](https://zod.dev/) |
| **Effect Schema** | Decode/encode stages; Standard Schema output | Encode/decode pipeline | [Effect Schema intro](https://effect.website/docs/schema/introduction/) |
| **Standard Schema** | Interop interface (`~standard.validate`) | Ecosystem contract for tools (incl. TanStack DB) | [Standard Schema](https://standardschema.dev/) |
| **Valibot / ArkType** | Alt Standard Schema libs | Same niche | Cited via TanStack schemas guide |

**Dedicated “mutation middleware chain” libs:** No widely used, CMS-grade, storage-agnostic npm primitive showed up that is *only* “beforeValidate/beforeSave/afterSave for any repository.” Closest honest answers:

1. **hookable/tapable + your stage names** around protocol writes,  
2. **ORM/ODM middleware** (Mongoose/Prisma/Mikro/TypeORM) bound to their clients,  
3. **CMS framework hooks** bound to their servers.

Do not confuse HTTP middleware (Koa/Hono) or tRPC/oRPC procedure middleware with editorial content stages — steal onion shape, not the HTTP binding (see §9.A / §9.F).

---

## 9. Widened spectrum *(new survey)*

### A. Server middleware / write pipelines (patterns for domain ops)

| Pattern | What docs give you | Steal for CMS writes? |
| --- | --- | --- |
| **Koa onion** | `await next()` middleware stack | Yes — same shape as PocketBase `e.next()` | [Koa guide](https://koajs.com/) |
| **NestJS interceptors / pipes** | Intercept call → `next.handle()`; pipes transform/validate inputs | Yes as pattern; Nest as product = no | [Nest interceptors](https://docs.nestjs.com/interceptors) |
| **Hono middleware** | HTTP middleware composition | Only if you mistakenly equate `/_cms` HTTP with domain pipeline; prefer domain onion inside host | [Hono middleware](https://hono.dev/docs/guides/middleware) |
| **Command bus / mediator** | Route commands to handlers (e.g. Nest CQRS-style; community mediators) | Optional app-layer wiring; **you** still invent editorial stages + collections | Pattern only — verify any specific lib’s README before adopting |

Honesty: these are **architectural patterns**, not PocketBase replacements.

### B. ORM / repository lifecycle hooks

| ORM | Hooks / events | Notes |
| --- | --- | --- |
| **Prisma** | `$extends` **query** component wraps operations (`args`, `query(args)`); also result/model components | Query middleware, not CMS vocabulary. [Query extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions/query) |
| **Drizzle** | **No** general entity lifecycle hooks; `Logger`, **Proxy** callback, cache `onMutate` | [Goodies](https://orm.drizzle.team/docs/goodies), [Proxy](https://orm.drizzle.team/docs/connect-drizzle-proxy), [Cache](https://orm.drizzle.team/docs/cache) |
| **TypeORM** | `@BeforeInsert`/`@AfterUpdate`/… listeners; `EntitySubscriberInterface` | [Listeners and subscribers](https://typeorm.io/docs/listeners-and-subscribers) |
| **MikroORM** | `beforeCreate`/`afterUpdate`/…; flush + transaction events | [Events](https://mikro-orm.io/docs/events) |
| **Mongoose** | Classic `pre`/`post` on `save`, `validate`, `remove`, `findOneAndUpdate`, … | Historical template many CMS hooks echo. [Middleware](https://mongoosejs.com/docs/middleware.html) |

**Fit:** relevant only if a future adapter is SQL/Mongo-backed. FS-first v1 should not grow an ORM just to get hooks.

### C. Content / file CMS adjacent

| Tool | Mutation / lifecycle story | Fit note |
| --- | --- | --- |
| **Keystatic** | Reader API for Node read of collections | Pattern for typed FS read; not hook bus |
| **Tina** | GraphQL Content API over Git; data layer index | Closest “Git SoT + query API”; ownership heavy |
| **Decap** | Git commit / editorial_workflow PRs | Workflow ≠ middleware |
| **Contentlayer / Velite / Astro content layer** | **Build-time** content load → typed data; not runtime authoring mutation pipelines | Complementary to Astro collections; not write hooks |
| **unstorage** | Unified `get`/`set`/`remove`/… + **20+ drivers** incl. FS, Redis, S3, memory, GitHub read, overlay | Strong **CRUD-over-storage** abstraction for adapters — **no** editorial stages. [unstorage](https://unstorage.unjs.io/), [Drivers](https://unstorage.unjs.io/drivers) |
| **gray-matter** | Front-matter parse only | No lifecycle |

### D. Authorization + filter languages (PocketBase rules adjacent)

| Tool | What you get | Without owning a BaaS? |
| --- | --- | --- |
| **CASL** | Isomorphic `Ability` definitions; check `can('update', entry)`; pack rules for UI | **Yes** — pure lib. [CASL intro](https://casl.js.org/v6/en/guide/intro) |
| **OpenFGA** JS SDK | Relationship-based checks against an OpenFGA server | Policy engine dependency, not embedded rules DSL |
| **OPA** | Rego policies; usually sidecar/HTTP | Externalized policy |
| **Permit.io** | Authz platform SDK over policy models | SaaS/control-plane flavored |

To express **collection list/view/create rules** without a BaaS: CASL (or hand-rolled predicates over protocol capabilities) is the portable path. PocketBase/Instant **filter DSLs** are attractive but product-bound.

### E. Realtime / presence *(brief)*

| Tool | Helps CRUD abstraction? | vs FS drafts (ADR-0014) |
| --- | --- | --- |
| **Yjs / Automerge / Loro** | CRDT merge for collaborative docs | **Fight** file-atomic drafts unless CRDT becomes SoT |
| **PartyKit / Durable Objects** | Presence / edge rooms | Irrelevant to hooks+CRUD unless you build collab |

Skip deep investment unless product identity shifts to multiplayer editing.

### F. BFF / typed API layers

| Layer | Middleware / validation | Collections? |
| --- | --- | --- |
| **tRPC** | `.use()` middleware on procedures; zod inputs common | You invent routers. [Middleware](https://trpc.io/docs/server/middlewares), [Procedures](https://trpc.io/docs/server/procedures) |
| **oRPC** | Procedure middleware + Standard Schema; OpenAPI optional | Same. [oRPC](https://orpc.dev/), middleware docs linked from home |
| **ts-rest** | Contract-first HTTP + Zod | Contract ≠ collection store |
| **Eden Treaty** | Typed client for Elysia | Elysia-bound |
| **Effect services / Layer** | Compose “app” dependencies (repos, validators) without PocketBase executable | Architectural substitute for wiring — **you** still write CRUD + hooks |

Useful as **host API skin** over CMS protocol; not a substitute for editorial stages or FS adapter.

### G. Lesser-known collection / store libs

| Lib | Claim | Hooks/CRUD? | Fit |
| --- | --- | --- | --- |
| **Legend-State** | Signals + persist/sync plugins; `synced` / CRUD-oriented sync plugins | Sync/persist, not CMS stages | UI state / optional sync — React-leaning. [Getting started](https://legendapp.com/open-source/state/v3/intro/getting-started/), [Persist and sync](https://www.legendapp.com/open-source/state/v3/sync/persist-sync/) |
| **SignalDB** | Reactive local DB; Mongo-like; SyncManager pull/push | Local collections + sync | Local-first product tilt. [SignalDB](https://signaldb.js.org/), [Sync](https://signaldb.js.org/sync/) |
| **LokiJS** | In-memory DB ± persist | Collection events historically | Dev/prototype; not FS CMS |
| **LowDB** | Tiny JSON file DB; adapters | `read`/`write`/`update` — no hook bus | Closest “JSON file CRUD” toy to FS adapter — still not protocol/IR. [lowdb](https://github.com/typicode/lowdb) |
| **conf / electron-store** | App config persistence | No | Wrong layer |
| **zustand / nanostores / @tanstack/store** | UI stores | **No** collection CRUD product claim | Shell UI state only |
| **SurrealDB JS** | DB client; live queries | DB events ≠ portable CMS hooks | Embedded/remote DB product |
| **Turso / libSQL** | SQLite client | SQL as alternative to PB SQLite | Viable **adapter backend**, not authoring UI store |

---

## 10. Spectrum of abstraction layers *(new)*

Thinnest → thickest. What you **gain** vs **lose** at each step:

```text
[1] hookable / tapable / custom stage map
[2] Zod / Effect Schema / Standard Schema
[3] CASL (or hand predicates) for can(list|view|create|update|delete)
[4] unstorage / LowDB-like KV-or-JSON drivers          ← storage CRUD only
[5] ORM middleware (Prisma/Mikro/TypeORM/Mongoose)   ← if SQL/Mongo adapter
[6] TanStack DB QueryCollection + paced mutations    ← client collection UX
[7] RxDB / SignalDB / sync engines                   ← local DB becomes SoT risk
[8] tRPC/oRPC/Effect app shell                       ← typed host API, still your ops
[9] CMS frameworks (Payload/Keystone/…)              ← steal stages; own process
[10] PocketBase / Convex / Instant / TinaCloud       ← full product ownership
```

| Layer | You get | You lose / risk |
| --- | --- | --- |
| 1–3 | Portable editorial + validate + authz | Must invent stage vocabulary + wire to protocol |
| 4 | Pluggable FS/KV `get/set` | No queries/hooks; not entry protocol |
| 5 | Mature pre/post persist | ORM/DB identity; fights FS-first |
| 6 | Live queries, optimistic + **debounced autosave** | Not server rules; not FS atomicity |
| 7 | Offline/local DB + mongoose-like hooks | SoT drift from Astro content files |
| 8 | End-to-end types for `/_cms` | No collections/hooks for free |
| 9–10 | Integrated hooks+CRUD+rules UX | **Become that backend** |

**Composition honesty:** Astro Dev CMS already occupies a custom band between 1–4 and 8 (protocol + FS adapter). Adding **6** in the authoring shell and **1–3** in the host is coherent. Jumping to **7** or **10** changes product identity.

---

## 11. Editorial stage model (portable) *(new)*

Recommended **closed vocabulary** for a protocol-host write pipeline, synthesized from primary sources (not a new product claim):

| Portable stage | Intent | Echoes |
| --- | --- | --- |
| `resolveInput` | Normalize/transform incoming `data` before validate | Keystone `resolveInput`; Payload `beforeValidate` (format); Mongoose transforms |
| `validate` | Authoritative schema/business rules; fail closed | Keystone `validate`; Payload validation after `beforeValidate`; PocketBase `onRecordValidate`; Zod/Effect Schema; ADR-0014 authoritative validate |
| `beforeWrite` | Last chance side effects / abort before persist | Keystone `beforeOperation`; Payload `beforeChange`/`beforeDelete`; RxDB `preSave`/`preInsert`; Mongoose `pre('save')`; Directus `filter`; Kirby `:before` |
| `persist` | Adapter write (FS atomic replace / protocol outcome) | Keystone DB; PocketBase execute; **your FS adapter** |
| `afterWrite` | Success side effects only (search index, notify) | Keystone `afterOperation`; Payload `afterChange`; RxDB `postSave`; PocketBase `onRecordAfter*Success`; Directus `action`; Kirby `:after` |
| `onWriteError` | Failure path | Payload `afterError`; PocketBase `onRecordAfter*Error` |

**Abort semantics recommendation:** throw typed errors (hookable/Payload/Kirby style) **or** explicit `{ ok: false }` results aligned with CMS protocol outcomes — prefer one. Onion `next()` (PocketBase/Koa) is fine internally but need not be public API.

**Out of band (do not overload write stages):** Decap/Sanity **publish workflow**, draft eligibility / autosave session policy (authoring session — CONTEXT.md), revision conflict (ADR-0014).

---

## 12. Autosave / paced mutations / draft sessions *(new)*

| Concern | Owner today (product) | Library help |
| --- | --- | --- |
| Responsive UI + coalesced writes | Authoring session (CONTEXT: debounced autosave internal seam) | TanStack **`createPacedMutations` + `debounceStrategy`** |
| Schema gate / create-id eligibility | Authoring session | Zod/IR validate; TanStack schema on client mutations (client-only!) |
| Authoritative validate + atomic file replace | Host FS adapter | Not TanStack; not RxDB |
| Revision / conflict precondition | Protocol write outcomes | Host; optimistic rollback if using TanStack |
| Invalid browser state must not clobber disk | ADR-0014 | Keep SoT on disk; LocalOnly drafts ≠ canonical |

**Implication:** paced mutations are a **client pacing** tool. Pair with host hooks (`validate` → `beforeWrite` → persist → `afterWrite`). Do not treat TanStack optimistic state as canonical content.

---

## 13. Honest answer: reusable vs what every CMS still invents

### Reusable today (commodity)

| Concern | Reuse |
| --- | --- |
| Hook bus / plugin taps / bail+waterfall | hookable, tapable, or 50-line custom |
| Validation / transform | Zod, Effect Schema, Valibot (Standard Schema) |
| Client collection + live query + optimistic + **paced autosave** into *your* API | TanStack DB (QueryCollection + `createPacedMutations`) |
| Authorization predicates | CASL (or host-specific rules) |
| KV/FS driver CRUD | unstorage (adapter experimentation) |
| Browser persistence (if you truly need it) | Dexie / RxDB / TinyBase persisters |
| Typed host RPC skin | tRPC / oRPC / ts-rest (optional) |

### Still invented per CMS (including this one)

| Concern | Why libraries don’t finish it |
| --- | --- |
| **Serializable CMS protocol** (entry identity + `data` DTOs, no FS paths on the wire) | Product-specific contract ([ADR-0005](../adr/0005-write-back-contract.md), [ADR-0008](../adr/0008-backend-agnostic-ui-fs-first-adapter.md)) |
| **FS adapter semantics** (atomic write, revision/hash guards, invalid browser state must not clobber disk) | ADR-0014-class behavior; not TanStack/RxDB |
| **Editorial stage vocabulary** mapped to content ops | Payload/Keystone vocabularies are framework-bound; PocketBase’s are goja-bound — §11 proposes a portable subset |
| **Collection access rules as filter DSL** | PocketBase/Instant package this with their query engines |
| **IR → form model → Astro `content.config` projections** | Differentiator of this product; not a data-store concern |
| **Draft eligibility / autosave session** | Authoring-session policy; libraries only help pacing |

**Bottom line:** “Nothing exists” is false for **collections clients**, **hook buses**, **ORM middleware**, and **KV drivers**. It is approximately true for **“PocketBase-shaped: hooks + CRUD + rules, as a portable TS library that stays backend-agnostic.”** That combo is almost always a **framework or executable**, not an npm primitive.

---

## 14. Recommendation shortlist (compose layers) *(refined)*

Compose; do not pick a single silver bullet.

### Option A — Host write pipeline: `hookable` (or tapable/custom) + Zod/Effect Schema

- **Use if:** you want Payload/PocketBase-*shaped* editorial stages without adopting a BaaS; FS/protocol remain source of truth.  
- **Wire:** `resolveInput` → `validate` → `beforeWrite` → adapter persist → `afterWrite` (§11).  
- **Avoid if:** you expected a single dependency to also give live queries, offline sync, and rules DSL.  
- **Abort:** prefer throw or protocol error results; use tapable bail only if you need non-throw cancel.

### Option B — Authoring shell: TanStack DB (QueryCollection or custom) + paced mutations

- **Use if:** typed collections, live queries, optimistic mutations, Svelte bindings; `onInsert`/`onUpdate`/`onDelete` → CMS protocol; autosave via `createPacedMutations`/`debounceStrategy`.  
- **Avoid if:** adopting Electric/PowerSync/RxDB collections as **canonical** content; or expecting built-in `beforeValidate` stages (keep those on the host — Option A).

### Option C — Study Payload/Keystone/PocketBase/Mongoose/RxDB stages; implement locally (do not depend)

- **Use if:** designing the editorial API surface (§6–§7, §11).  
- **Avoid if:** tempted to “just use Payload/PocketBase” under an Astro FS-first shell.

### Option D — RxDB / local document DB only if product intent shifts

- **Use if:** local RxCollections + `preSave` middleware are desirable as a deliberate store (possibly Node storage for a **non-FS** adapter experiment).  
- **Avoid if:** Astro content files / protocol DTOs must remain canonical (**likely for this repo**).

### Compose guidance (explicit)

```text
Authoring UI  →  (optional) TanStack DB QueryCollection + paced autosave
            →  CMS protocol (serializable)
Host          →  hookable stages + IR/Zod validate
            →  FS adapter (atomic write + revision)  [or later: other adapters]
            →  (optional) CASL for capability checks
```

**Never:** replace FS canonical content with RxDB/SignalDB/Legend persist as default.  
**Optional later:** unstorage driver behind an adapter for KV backends; SQL (Turso/libSQL) as an alternate adapter — still behind protocol.

### Explicit anti-goals / non-recommendations *(updated)*

| Anti-goal | Why |
| --- | --- |
| InstantDB / Convex / Firebase / Appwrite-as-core | Hosted control plane owns writes |
| Embedding PocketBase as the CMS runtime | goja hooks + PB executable = become that backend |
| Electric / PowerSync / LiveStore / Jazz / Triplit / Replicache as **primary content store** | Sync/eventlog/Postgres-shape becomes architecture |
| Payload / Keystone / Directus / Strapi / TinaCloud as libraries under the shell | Framework process ownership |
| Sanity document actions / Decap PR workflow as in-process hooks | Different metaphor (UI actions / Git) |
| Yjs/Automerge/Loro as default draft model | Conflicts with atomic FS draft identity |
| Drizzle/Prisma/Mikro **only** to obtain hooks on v1 FS path | Wrong dependency motive |
| Assuming TanStack schema validates server/FS loads | Docs: client mutations only |
| Treating zustand/nanostores/@tanstack/store as collection CRUD | UI state only |
| Building OpenFGA/OPA/Permit **platform** just for local dev CMS rules | Overkill vs CASL/capabilities |

---

## 15. Sources

### TanStack DB
- https://tanstack.com/db/latest/docs/overview  
- https://tanstack.com/db/latest/docs/guides/mutations  
- https://tanstack.com/db/latest/docs/guides/schemas  
- https://tanstack.com/db/latest/docs/guides/live-queries  
- https://tanstack.com/db/latest/docs/collections/query-collection  
- https://tanstack.com/db/latest/docs/collections/local-only-collection  
- https://tanstack.com/db/latest/docs/collections/electric-collection  
- https://tanstack.com/db/latest/docs/guides/collection-options-creator  
- https://tanstack.com/db/latest/docs/framework/svelte/overview  
- https://tanstack.com/db/latest/docs/reference/functions/createOptimisticAction  
- https://tanstack.com/db/latest/docs/reference/functions/createPacedMutations  

### PocketBase
- https://pocketbase.io/docs/js-overview/  
- https://pocketbase.io/docs/js-event-hooks/  
- https://pocketbase.io/docs/js-records/  
- https://pocketbase.io/docs/api-rules-and-filters/  
- https://pocketbase.io/jsvm/interfaces/hook.Hook.html  

### Client data / sync / local stores
- https://rxdb.info/middleware.html  
- https://rxdb.info/rx-collection.html  
- https://rxdb.info/rx-storage.html  
- https://electric.ax/docs/sync/api/clients/typescript  
- https://docs.powersync.com/client-sdk-references/javascript-web  
- https://docs.livestore.dev/overview/introduction/  
- https://www.instantdb.com/docs/permissions  
- https://www.instantdb.com/docs/instaml  
- https://jazz.tools/docs  
- https://doc.replicache.dev/concepts/how-it-works  
- https://doc.replicache.dev/howto/share-mutators  
- https://tinybase.org/guides/the-basics/  
- https://watermelondb.dev/docs  
- https://dexie.org/docs/Tutorial/Design  
- https://dexie.org/docs/Table/Table.hook()  
- https://github.com/aspen-cloud/triplit  
- https://www.triplit.dev  
- https://signaldb.js.org/  
- https://signaldb.js.org/sync/  
- https://legendapp.com/open-source/state/v3/intro/getting-started/  
- https://www.legendapp.com/open-source/state/v3/sync/persist-sync/  
- https://github.com/typicode/lowdb  
- https://github.com/techfort/LokiJS  

### BaaS / backend comparison
- https://docs.convex.dev/functions/actions  
- https://appwrite.io/docs/products/functions/functions  

### CMS / file-CMS hook & workflow patterns
- https://payloadcms.com/docs/hooks/overview  
- https://payloadcms.com/docs/hooks/collections  
- https://keystonejs.com/docs/config/hooks  
- https://directus.com/docs/guides/extensions/api-extensions/hooks  
- https://docs.strapi.io/cms/backend-customization/models  
- https://www.sanity.io/docs/studio/document-actions  
- https://www.sanity.io/docs/studio/document-actions-api  
- https://www.sanity.io/docs/content-lake/webhooks  
- https://www.sanity.io/docs/content-lake/dispatch-actions  
- https://getkirby.com/docs/reference/plugins/extensions/hooks  
- https://decapcms.org/docs/editorial-workflows/  
- https://decapcms.org/docs/configuration-options/  
- https://tina.io/docs/features/data-fetching  
- https://tina.io/docs/reference/content-api/data-layer  
- https://keystatic.com/docs/reader-api  

### ORM / ODM lifecycle
- https://www.prisma.io/docs/orm/prisma-client/client-extensions/query  
- https://orm.drizzle.team/docs/goodies  
- https://orm.drizzle.team/docs/connect-drizzle-proxy  
- https://orm.drizzle.team/docs/cache  
- https://typeorm.io/docs/listeners-and-subscribers  
- https://mikro-orm.io/docs/events  
- https://mongoosejs.com/docs/middleware.html  

### Validation / schema ecosystem
- https://zod.dev/  
- https://effect.website/docs/schema/introduction/  
- https://standardschema.dev/  

### Thin building blocks / authz / API layers / storage
- https://www.npmjs.com/package/hookable  
- https://github.com/unjs/hookable  
- https://github.com/webpack/tapable  
- https://casl.js.org/v6/en/guide/intro  
- https://trpc.io/docs/server/procedures  
- https://trpc.io/docs/server/middlewares  
- https://orpc.dev/  
- https://unstorage.unjs.io/  
- https://unstorage.unjs.io/drivers  
- https://koajs.com/  
- https://docs.nestjs.com/interceptors  
- https://hono.dev/docs/guides/middleware  
- https://github.com/openfga/js-sdk  
- https://github.com/yjs/yjs  

### Embedded SQL alternatives
- https://surrealdb.com/docs/sdk/javascript (SurrealDB JS SDK hub)  
- https://docs.turso.tech/sdk/ts/reference (Turso / libSQL TS)  

### In-repo product constraints
- [CONTEXT.md](../../CONTEXT.md)  
- [AGENTS.md](../../AGENTS.md)  
- [docs/adr/0008-backend-agnostic-ui-fs-first-adapter.md](../adr/0008-backend-agnostic-ui-fs-first-adapter.md)  
- [docs/adr/0005-write-back-contract.md](../adr/0005-write-back-contract.md)  
- [docs/adr/0014-working-tree-is-the-local-draft.md](../adr/0014-working-tree-is-the-local-draft.md)  
