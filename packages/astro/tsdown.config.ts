import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

const pkg = JSON.parse(
	readFileSync(
		fileURLToPath(new URL("./package.json", import.meta.url)),
		"utf8",
	),
) as { exports: Record<string, string> };

const exportEntries = Object.values(pkg.exports).filter(
	(p): p is string => typeof p === "string" && p.endsWith(".ts"),
);

/**
 * Not in public exports / not reached by static imports from those entries —
 * resolved at runtime via import.meta.url, Vite path inject, or package bin.
 */
const runtimeEntries = [
	"./src/cli.ts",
	"./src/host/default-host.ts",
	"./src/stamped/shell-form-models.ts",
	"./src/content-proxy/shims/astro-loaders.ts",
	"./src/content-proxy/shims/astro-content-sync.ts",
];

const entry = [...new Set([...exportEntries, ...runtimeEntries])];
if (
	entry.length === 0 ||
	entry.some((p) => typeof p !== "string" || !p.startsWith("./src/"))
) {
	throw new Error(
		"@cms/astro package.json exports / runtime entries must be ./src/* paths",
	);
}

export default defineConfig({
	entry,
	outDir: "dist",
	dts: true,
	format: ["esm"],
	platform: "node",
	// Publish exports use `.js`; node platform would otherwise emit `.mjs`.
	fixedExtension: false,
	deps: {
		neverBundle: [
			"@cms/core",
			"@cms/authoring",
			"astro",
			"svelte",
			"vite",
			"zod",
			/^node:/,
			/^virtual:/,
			/^astro\//,
		],
	},
	unbundle: true,
	copy: [
		{ from: "src/host/shell-page.astro", to: "dist/host" },
		{ from: "src/host/cms-mount.svelte", to: "dist/host" },
	],
});
