import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

const pkg = JSON.parse(
	readFileSync(
		fileURLToPath(new URL("./package.json", import.meta.url)),
		"utf8",
	),
) as { exports: Record<string, string> };

const entry = Object.values(pkg.exports);
if (
	entry.length === 0 ||
	entry.some((p) => typeof p !== "string" || !p.startsWith("./src/"))
) {
	throw new Error(
		"@cms/core package.json exports must be ./src/* string paths",
	);
}

export default defineConfig({
	entry,
	outDir: "dist",
	dts: true,
	format: ["esm"],
	platform: "neutral",
	// package.json deps are already external; keep node: builtins out of the bundle.
	deps: {
		neverBundle: ["zod", "pathe", /^node:/],
	},
	unbundle: true,
});
