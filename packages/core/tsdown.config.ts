import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/node.ts",
		"src/define-cms/define-cms.ts",
		"src/form-tree/form-tree.ts",
		"src/http/index.ts",
		"src/protocol/fetch-client.ts",
		"src/protocol/protocol.ts",
		"src/semantic/index.ts",
	],
	outDir: "dist",
	dts: true,
	format: ["esm"],
	platform: "neutral",
	external: ["zod", "pathe", /^node:/],
	unbundle: true,
});
