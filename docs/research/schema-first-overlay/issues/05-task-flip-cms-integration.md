# 05 — Flip `cms()` happy path

Type: task  
Status: resolved  
Blocked by: [04](./04-task-host-from-stamped-config.md)

## Goal

Product `cms()` installs content-proxy, does **not** generate `content.config`, treats `cms.config` / `cms.components` as **optional**, wires default host + shell + `/_cms` from stamped collections + optional overlay.

## Context

Today: `packages/astro/src/integration.ts` requires config, calls `generateContentConfig`.  
Conventions in `vite-config-plugin.ts` / `conventions.ts`.

## Acceptance

- [x] `cms()` setup: register content-proxy Vite plugins/aliases before Content Layer needs them
- [x] No `generateContentConfig` in product `cms()` path
- [x] Missing `cms.config` → stock forms from 03/04 (simple demo)
- [x] Present `cms.config` → overlay merge (API may be stubbed if 07 lands defineCms shape; minimum: load virtual config when file exists)
- [x] `requireConfig: true` removed from product mode (or inverted)
- [x] Harness updated: `generate` option removed or no-op; document escapes
- [x] Integration/unit tests updated for new happy path
- [x] Shell `/cms` still mounts when collections resolve

## Notes

New `defineCms(collections, config)` can land here or be completed in 07; if stubbed, 07 must finish the overlay API. Prefer landing the function signature in this ticket even if overlay features are minimal.

## Delivered

- Product `cms()` → `requireContentConfig: true`; overlay `cms.config` optional
- Content-proxy (`vitePluginsForBoot` + `viteAliasesForBoot`) always installed in setup
- Default host: stamped `virtual:@cms/content-config` → `buildFsHostFromStampedCollections`
- Shell: SSR `loadShellFormModels()` (+ optional overlays) → `CmsMount` lowers with catalog
- `defineCms(collections, config)` landed; IR builder quarantined as `defineCmsIr`
- Generate left under `@cms/astro/generate` / CLI for ticket 08; harness `generate` is no-op
- Tests: `bun run --filter @cms/astro test:happy-path` (+ package `check`)

## Stubs for 06 / 07

- **06:** demo with content.config only — stock forms path is ready
- **07:** deepen overlay (singleton, richer nested chrome); wire demo `cms.config` + components to `defineCms`
