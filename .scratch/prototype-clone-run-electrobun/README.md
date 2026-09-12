# PROTOTYPE — Electrobun + Bun clone→run

Throwaway spike beside `.scratch/prototype-clone-run/` (Deno Desktop).

**Question:** Can an Electrobun app (Bun main process) clone a GitHub Astro repo, `bun install` via the resolved Bun engine (no system npm for the happy path), run the dev server, show it in a native webview, and live-eval Zod schemas from `content.config.ts`?

## Run

From repo root:

```bash
bun run prototype:clone-run-electrobun
```

Or:

```bash
cd .scratch/prototype-clone-run-electrobun
bunx electrobun sync
bunx electrobun dev
```

Requires network on first sync (Electrobun/Hutch toolchain). Clones land in `WIP-PROTOTYPE-wipe-me/` next to this prototype (gitignored), never under `*.app/Contents/Resources`. Override with `PROTOTYPE_WIP_ROOT` if needed; packaged runs without a source tree fall back to `Utils.paths.userData`.

Smoke (no UI): `bun smoke-resolve.mjs` — checks bun resolution prefers `Contents/MacOS/bun` over the `Resources/app/bun` JS-bundle directory.

## Default target

`https://github.com/withastro/astro/tree/main/examples/blog`
