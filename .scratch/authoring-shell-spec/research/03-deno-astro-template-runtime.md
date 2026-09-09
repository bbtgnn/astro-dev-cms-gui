# Research: Deno as `@cms/astro-template` runtime

**Ticket:** [Deno as @cms/astro-template runtime](../issues/03-deno-astro-template-runtime.md)  
**Question:** Can `@cms/astro-template` dogfood on **Deno** today (Astro + Svelte UI, local FS **write-back**, monorepo workspace packages)? What works, what breaks, and what should the buildable spec say about Node vs Deno for the template?  
**Scope:** Deno as *template runtime* only. Deno-desktop / PWA / isomorphic-git sync products are out of scope.  
**Sources:** primary docs only (Deno, Astro, `@deno/astro-adapter` / template READMEs). Retrieved 2026-09-09.

## Verdict

**Yes, with conditions.** Deno 2.x can host an Astro project for local `dev` / `build`, run SSR via `@deno/astro-adapter`, consume npm packages (including `@astrojs/svelte`), participate in monorepo workspaces, and write local files when granted write permission. The authoring shell’s **write-back** path is viable on **local Deno**, not as a Deploy/edge story. The buildable spec should treat **Deno as a first-class dogfood runtime for `@cms/astro-template`**, while keeping **Node as the default consumer runtime** unless the project opts into Deno tasks/permissions.

## What works today

### Astro local develop and build under Deno

- Deno’s official Astro tutorial scaffolds with `deno init --npm astro@latest` and starts the app with `deno task dev` ([Build Astro with Deno](https://docs.deno.com/examples/astro_tutorial/)).
- Deno’s Astro blog walkthrough uses `deno -A npm:create-astro@latest`, `deno install --allow-scripts`, and `deno task dev` ([Build an Astro site with Deno](https://deno.com/blog/build-astro-with-deno)).
- `@deno/astro-adapter` documents tasks that run the Astro CLI **through Deno**:
  - `deno run -A npm:astro dev`
  - `deno run -A npm:astro build`
  - preview via `deno run --allow-net --allow-read --allow-env ./dist/server/entry.mjs`  
  ([denoland/deno-astro-adapter README](https://github.com/denoland/deno-astro-adapter/blob/main/README.md))

### SSR / on-demand routes on Deno

- Astro’s deploy guide: install `@deno/astro-adapter`, set `output: 'server'` and `adapter: deno()`, then preview the generated `dist/server/entry.mjs` with Deno ([Deploy your Astro Site with Deno](https://docs.astro.build/en/guides/deploy/deno/)).
- Astro’s integration page states the adapter is **maintained by Deno**; usage lives in the adapter repo ([@deno/astro-adapter | Astro Docs](https://docs.astro.build/en/guides/integrations-guide/deno/)).
- Adapter README: “Astro 6 works in Deno runtime (without Node)” ([adapter README](https://github.com/denoland/deno-astro-adapter/blob/main/README.md)).
- Deno Deploy frameworks reference documents the same adapter config; notes Sharp and `astro:env` are supported ([Frameworks | Deno Docs](https://docs.deno.com/deploy/reference/frameworks/)).

### Svelte shell UI (islands) in an Astro host

- `@astrojs/svelte` is the official Astro integration for Svelte 5 SSR + client hydration, powered by `@sveltejs/vite-plugin-svelte` ([@astrojs/svelte](https://docs.astro.build/en/guides/integrations-guide/svelte/)).
- Primary sources do **not** document a Deno-specific blocker for this integration. Under Deno’s npm compatibility, Astro integrations are ordinary npm packages ([Node and npm Compatibility](https://docs.deno.com/runtime/fundamentals/node/); [deno-astro-template README](https://github.com/denoland/deno-astro-template/blob/main/README.md) — “Compatibility with the majority of packages on npm”).
- Implication for the authoring shell: **shell UI** runs in the browser after hydration; Deno’s role is the Astro **dev/SSR host**, not a SvelteKit/Deno UI runtime.

### Local FS write-back

- Deno provides first-party writes (`Deno.writeTextFile` / `Deno.writeFile`) requiring `--allow-write` ([File System APIs](https://docs.deno.com/api/deno/file-system/); [Permissions](https://docs.deno.com/runtime/reference/permissions/)).
- Node-style write-back is also available: `node:fs` / `node:fs/promises` are listed as fully supported modules, with `writeFile` documented under Deno’s Node API surface; known gap is missing encodings `utf16le`, `latin1`, `ucs2` ([Node APIs](https://docs.deno.com/runtime/reference/node_apis/); [fs/promises writeFile](https://docs.deno.com/api/node/fs/promises/~/writeFile); [Node and npm Compatibility](https://docs.deno.com/runtime/fundamentals/node/)).
- Adapter/dev recipes that use `deno run -A …` (all permissions) already include write ([adapter README](https://github.com/denoland/deno-astro-adapter/blob/main/README.md)).

### Monorepo / workspace packages (`@cms/*`)

- Deno workspaces support members with `deno.json`, hybrid `deno.json`+`package.json`, or **package.json-only** Node-first packages, resolving bare package names across members ([Workspaces and monorepos](https://docs.deno.com/runtime/fundamentals/workspaces/)).
- Deno reads npm `package.json` `"workspaces"` directly; members can use the `workspace:` protocol ([Workspaces](https://docs.deno.com/runtime/fundamentals/workspaces/); [Migrate from npm](https://docs.deno.com/runtime/migrate/migrate_from_npm/)).
- **pnpm caveat:** Deno does **not** read `pnpm-workspace.yaml`; the member list must live in root `deno.json` `workspace` or `package.json` `workspaces` ([Configure a monorepo with workspaces](https://docs.deno.com/examples/workspaces_monorepo_tutorial/)).

## What breaks or needs explicit handling

### Preview permissions omit write (footgun for write-back)

Official SSR preview commands grant only `--allow-net --allow-read --allow-env` — **not** `--allow-write` ([adapter README](https://github.com/denoland/deno-astro-adapter/blob/main/README.md); [Astro Deno deploy guide](https://docs.astro.build/en/guides/deploy/deno/)).

If write-back endpoints run in that production-style Deno entry (not only `astro dev` under `-A`), they will fail with permission errors until `--allow-write` (scoped to content paths) is added.

### Deno Deploy is the wrong place for content write-back

- **Deploy Classic** FS APIs are read-oriented; `Deno.open` does not support writing ([File system APIs — Deploy Classic](https://docs.deno.com/deploy/classic/api/runtime-fs/)). Classic is also sunsetting (July 20, 2026) per that page.
- Deno team confirmation: Deploy has a read-only filesystem for classic deployments ([deno#26830](https://github.com/denoland/deno/issues/26830) — primary maintainer reply).
- Newer Deno Deploy runtime docs claim FS write under `--allow-all`, but the environment is **serverless / ephemeral** (instances start/stop; disk is not a durable project content store) ([Runtime](https://docs.deno.com/deploy/reference/runtime/)).

Authoring-shell **write-back** (edit content files in the repo) remains a **local-dev** concern. Do not couple the template’s write-back contract to Deploy.

### Tooling / DX gaps (not runtime blockers)

- Deno LSP does not support `.astro` files (false diagnostics) ([Deno blog — Build an Astro site with Deno](https://deno.com/blog/build-astro-with-deno)).
- Official Deno + Astro template still recommends **npm for dependency management** and notes the Astro build still goes through Vite/esbuild, so HTTPS Deno remote imports and some Deno-only language features do not pass through unchanged ([deno-astro-template README](https://github.com/denoland/deno-astro-template/blob/main/README.md)).
- Native Node addons (e.g. some image pipelines) need a local `node_modules` dir and `--allow-ffi` ([Node and npm Compatibility](https://docs.deno.com/runtime/fundamentals/node/)); install may need `--allow-scripts` ([Deno Astro blog](https://deno.com/blog/build-astro-with-deno)). Deno Deploy’s Astro notes say Sharp is supported in that hosting context ([Frameworks](https://docs.deno.com/deploy/reference/frameworks/)) — still separate from local write-back.

### No primary-source “Astro + Svelte + Deno + write-back” end-to-end sample

Official Deno Astro tutorials/templates demonstrate Astro (and SSR/CRUD against memory or Deno KV), not a Svelte authoring shell writing markdown/data collections ([astro tutorial](https://docs.deno.com/examples/astro_tutorial/); [deno-astro-template](https://github.com/denoland/deno-astro-template/blob/main/README.md)). Compatibility is compositional from the sources above, not a single blessed sample.

## Spec implications (Node vs Deno for `@cms/astro-template`)

| Concern | Spec should say |
| --- | --- |
| Template dogfood runtime | **Prefer Deno 2.x** for `@cms/astro-template` local dogfood (`deno task` / `deno run -A npm:astro …`), aligned with Deno’s first-party Astro path. |
| Consuming projects | **Node remains supported** as the mainstream Astro path; packages (`@cms/fields`, `@cms/components`, `@cms/routes`) stay npm-compatible Node-first or hybrid workspace members. |
| Shell UI | Svelte via `@astrojs/svelte` in the Astro host; no Deno-specific UI runtime. |
| Write-back | Implement against **local FS** (`Deno.*` or `node:fs/promises` with UTF-8). Document required Deno permissions: at least write (and read) scoped to content paths. Do **not** assume Deploy can persist content files. |
| SSR adapter | Use `@deno/astro-adapter` when the template needs on-demand Astro endpoints under Deno; static Astro needs no adapter ([Astro Deno deploy guide](https://docs.astro.build/en/guides/deploy/deno/); [adapter README](https://github.com/denoland/deno-astro-adapter/blob/main/README.md)). |
| Monorepo | Declare workspace members in root `deno.json` `workspace` and/or `package.json` `workspaces`. Avoid relying on `pnpm-workspace.yaml` alone if Deno is the template runner. |
| Out of scope (unchanged) | Deno-desktop, PWA, isomorphic-git sync products. |

## Bottom line for the buildable spec

`@cms/astro-template` **can dogfood on Deno today** for Astro + Svelte islands + monorepo packages + **local** write-back, using Deno 2 npm/Node compatibility and (when needed) `@deno/astro-adapter`. The hard requirements to write into the spec are: **explicit write permissions**, **workspace config Deno can see**, and a clear split that **Node is the portable package/consumer baseline** while **Deno is an allowed (preferred for dogfood) template host** — not Deno Deploy as the write-back target.

## Source index

1. https://docs.deno.com/examples/astro_tutorial/  
2. https://deno.com/blog/build-astro-with-deno  
3. https://github.com/denoland/deno-astro-adapter/blob/main/README.md  
4. https://docs.astro.build/en/guides/deploy/deno/  
5. https://docs.astro.build/en/guides/integrations-guide/deno/  
6. https://docs.deno.com/deploy/reference/frameworks/  
7. https://docs.astro.build/en/guides/integrations-guide/svelte/  
8. https://docs.deno.com/runtime/fundamentals/node/  
9. https://docs.deno.com/runtime/reference/node_apis/  
10. https://docs.deno.com/api/node/fs/promises/~/writeFile  
11. https://docs.deno.com/api/deno/file-system/  
12. https://docs.deno.com/runtime/reference/permissions/  
13. https://docs.deno.com/runtime/fundamentals/workspaces/  
14. https://docs.deno.com/examples/workspaces_monorepo_tutorial/  
15. https://docs.deno.com/runtime/migrate/migrate_from_npm/  
16. https://github.com/denoland/deno-astro-template/blob/main/README.md  
17. https://docs.deno.com/deploy/classic/api/runtime-fs/  
18. https://docs.deno.com/deploy/reference/runtime/  
19. https://github.com/denoland/deno/issues/26830  
