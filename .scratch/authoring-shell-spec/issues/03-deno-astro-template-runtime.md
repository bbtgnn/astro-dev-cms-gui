# Deno as @cms/astro-template runtime

Type: research
Status: resolved

## Question

Can `@cms/astro-template` dogfood on **Deno** today (Astro + Svelte islands/UI, local FS **write-back**, monorepo workspace packages)? What works, what breaks, and what does the buildable spec need to say about Node vs Deno for the template? Primary sources only (Deno, Astro, adapter/tooling docs).

## Answer

**Yes, with conditions.** Deno 2.x can host Astro (`dev`/`build`), SSR via `@deno/astro-adapter`, Svelte via `@astrojs/svelte`, monorepo workspaces, and local FS write-back when write permission is granted. Spec: prefer Deno for template dogfood; keep Node as the portable package/consumer baseline; require explicit `--allow-write` for write-back; do not treat Deno Deploy as the write-back target.

Full write-up: [research/03-deno-astro-template-runtime.md](../research/03-deno-astro-template-runtime.md)

## Comments

Primary sources show a composed path (Deno Astro tutorials + adapter + npm/Node compat + workspaces + FS APIs), not a single official Astro+Svelte+write-back sample. Preview scripts omit `--allow-write` — easy footgun if write-back runs under the production Deno entry.
