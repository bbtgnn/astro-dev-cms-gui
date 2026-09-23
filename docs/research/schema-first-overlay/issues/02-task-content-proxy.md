# 02 — Content proxy in `@cms/astro`

Type: task  
Status: resolved  
Blocked by: [01](./01-research-done.md)

## Goal

Ship host-only Vite (and shim modules) that stamp Astro `glob`/`file` location options and `reference` / function-schema `image` kinds — without changing user import paths (`astro/loaders`, `astro:content`).

## Context

Prior art: `astro-decap-github-connect/packages/zod-decap-local/src/content-proxy/` (`boot.ts`, `stamps.ts`, `stamp-helpers.ts`, `shims/astro-loaders.ts`, image stamp helpers).  
Research: [astro-loader-extraction.md](../../astro-loader-extraction.md).

## Acceptance

- [x] Package modules under e.g. `packages/astro/src/content-proxy/`
- [x] Vite plugin `enforce: "pre"` proxies `astro:content` (wrap `reference`, wrap `defineCollection` to stamp `ctx.image`)
- [x] `astro/loaders` alias/shim stamps `{ kind, base, pattern }` / `{ kind, fileName }` on a `Symbol.for` (or equivalent)
- [x] Real Astro validators still run (passthrough + meta)
- [x] Unit/integration test: evaluate a mini content.config through Vite or shim and assert stamps present
- [x] Document: custom loaders / bypass imports get no stamp
- [x] No browser exposure of content.config

## Notes

Optional esbuild emit path can be a follow-up inside this ticket or deferred to 04 if boot-only is enough for demos.
