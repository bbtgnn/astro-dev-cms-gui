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

/** Runtime-resolved via import.meta.url / proxyAssets — not in public exports. */
const colocatedEntries = [
	"./src/cli.ts",
	"./src/host/default-host.ts",
	"./src/stamped/shell-form-models.ts",
	"./src/content-proxy/shims/astro-loaders.ts",
	"./src/content-proxy/shims/astro-content-sync.ts",
];

const entry = [...new Set([...exportEntries, ...colocatedEntries])];
if (
	entry.length === 0 ||
	entry.some((p) => typeof p !== "string" || !p.startsWith("./src/"))
) {
	throw new Error(
		"@cms/astro package.json exports / colocated entries must be ./src/* paths",
	);
}

export default defineConfig({
	entry,
	outDir: "dist",
	dts: true,
	format: ["esm"],
	platform: "node",
	// Match core publish face (`.js` / `.d.ts`), not node-default `.mjs`.
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
	// Flatten into dist/host/ (default flatten treats a file `to` as a directory).
	copy: [
		{ from: "src/host/shell-page.astro", to: "dist/host" },
		{ from: "src/host/cms-mount.svelte", to: "dist/host" },
	],
});
