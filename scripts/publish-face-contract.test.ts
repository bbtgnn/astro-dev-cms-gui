import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
	assertPublishFace,
	createPublishFace,
	type PackageJson,
} from "./publish-face-contract.ts";

const workspacePackage: PackageJson = {
	name: "@cms/example",
	private: true,
	exports: {
		".": "./src/index.ts",
		"./shell": "./src/shell.svelte",
		"./page.astro": "./src/page.astro",
	},
	bin: { cms: "./src/cli.ts" },
	dependencies: { "@cms/core": "workspace:*", zod: "catalog:" },
	devDependencies: { typescript: "catalog:" },
	scripts: { check: "tsc" },
};

function publishFace(): PackageJson {
	return createPublishFace(workspacePackage, {
		packageName: "@cms/example",
		catalog: { zod: "^4.0.0" },
		workspaceVersion: (name) => (name === "@cms/core" ? "0.1.0" : ""),
		svelteCondition: true,
	});
}

describe("publish face contract", () => {
	test("derives consumer metadata from the workspace manifest", () => {
		expect(publishFace()).toMatchObject({
			private: false,
			files: ["dist"],
			exports: {
				".": {
					types: "./dist/index.d.ts",
					import: "./dist/index.js",
					svelte: "./dist/index.js",
				},
				"./shell": { svelte: "./dist/shell.svelte" },
				"./page.astro": { import: "./dist/page.astro" },
			},
			bin: { cms: "./dist/cli.js" },
			dependencies: { "@cms/core": "0.1.0", zod: "^4.0.0" },
		});
		expect(publishFace().devDependencies).toBeUndefined();
		expect(publishFace().scripts).toBeUndefined();
	});

	test("rejects a missing staged public target", () => {
		const root = mkdtempSync(path.join("/tmp", "publish-face-contract-"));
		try {
			const dist = path.join(root, "dist");
			mkdirSync(dist);
			for (const file of [
				"index.js",
				"index.d.ts",
				"shell.svelte",
				"page.astro",
			]) {
				writeFileSync(path.join(dist, file), "");
			}
			expect(() => assertPublishFace(dist, publishFace())).toThrow(
				'@cms/example bin "cms": missing staged target ./dist/cli.js',
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
