import type { ElectrobunConfig } from "electrobun";

/**
 * PROTOTYPE — Electrobun + Bun main process.
 * Explicitly requires Bun (not Cottontail/JSC default) so we can spawn
 * the same engine for `bun install` / `bun run dev`.
 */
export default {
	app: {
		name: "CloneRunElectrobunPrototype",
		identifier: "dev.scratch.prototype-clone-run-electrobun",
		version: "0.0.1",
	},
	build: {
		mainProcess: "bun",
		bun: {
			entrypoint: "src/bun/index.ts",
		},
		views: {
			mainview: {
				entrypoint: "src/mainview/index.ts",
			},
		},
		copy: {
			"src/mainview/index.html": "views/mainview/index.html",
			"src/mainview/index.css": "views/mainview/index.css",
			"src/preview/waiting.html": "views/preview/waiting.html",
			"inspect-content-config.mjs": "inspect-content-config.mjs",
		},
		mac: { bundleCEF: false },
		linux: { bundleCEF: false },
		win: { bundleCEF: false },
	},
} satisfies ElectrobunConfig;
