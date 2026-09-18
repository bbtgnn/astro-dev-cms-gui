/**
 * Contract tests for Vite virtual modules used by createCmsIntegration.
 */
import { describe, expect, test } from "bun:test";
import path from "node:path";
import { createCmsIntegration } from "../src/middleware";
import {
	CMS_CONFIG_VIRTUAL_ID,
	CMS_HOST_VIRTUAL_ID,
	CMS_INTEGRATION_OPTIONS_VIRTUAL_ID,
	cmsConfigVitePlugin,
	cmsHostVitePlugin,
	cmsIntegrationOptionsVitePlugin,
	resolveProjectEntry,
} from "../src/vite-config-plugin";

describe("resolveProjectEntry", () => {
	test("keeps absolute paths", () => {
		const abs = path.resolve("/tmp/host.ts");
		expect(resolveProjectEntry(abs, "/project")).toBe(abs);
	});

	test("resolves relative paths against project root", () => {
		expect(resolveProjectEntry("./src/cms/host.ts", "/project")).toBe(
			path.resolve("/project/src/cms/host.ts"),
		);
	});
});

describe("cmsConfigVitePlugin", () => {
	test("re-exports editor config entry", async () => {
		const entry = path.resolve("/project/src/cms/editor-config.ts");
		const plugin = cmsConfigVitePlugin({ entry });
		const resolved = await plugin.resolveId(CMS_CONFIG_VIRTUAL_ID);
		expect(resolved).toBe(`\0${CMS_CONFIG_VIRTUAL_ID}`);
		if (resolved == null) throw new Error("expected resolved id");
		const source = await plugin.load(resolved);
		expect(source).toContain(`from ${JSON.stringify(entry)}`);
		expect(source).toContain("export { collections, default }");
	});
});

describe("cmsHostVitePlugin", () => {
	test("re-exports createHost from host module", async () => {
		const entry = path.resolve("/project/src/cms/host.ts");
		const plugin = cmsHostVitePlugin({ entry });
		const resolved = await plugin.resolveId(CMS_HOST_VIRTUAL_ID);
		expect(resolved).toBe(`\0${CMS_HOST_VIRTUAL_ID}`);
		if (resolved == null) throw new Error("expected resolved id");
		const source = await plugin.load(resolved);
		expect(source).toBe(
			`export { createHost } from ${JSON.stringify(entry)};\n`,
		);
	});
});

describe("cmsIntegrationOptionsVitePlugin", () => {
	test("emits mount and allowInProd literals", async () => {
		const plugin = cmsIntegrationOptionsVitePlugin({
			mount: "/_cms",
			allowInProd: false,
		});
		const resolved = await plugin.resolveId(CMS_INTEGRATION_OPTIONS_VIRTUAL_ID);
		expect(resolved).toBe(`\0${CMS_INTEGRATION_OPTIONS_VIRTUAL_ID}`);
		if (resolved == null) throw new Error("expected resolved id");
		const source = await plugin.load(resolved);
		expect(source).toContain('export const mount = "/_cms";');
		expect(source).toContain("export const allowInProd = false;");
	});
});

describe("createCmsIntegration shellPath", () => {
	test("defaults to /cms when editorConfig is set", () => {
		const integration = createCmsIntegration({
			editorConfig: "./src/cms/editor-config.ts",
		});
		expect(integration.shellPath).toBe("/cms");
	});

	test("shellPath false skips inject", () => {
		const integration = createCmsIntegration({
			editorConfig: "./src/cms/editor-config.ts",
			shellPath: false,
		});
		expect(integration.shellPath).toBeUndefined();
	});

	test("normalizes custom shellPath", () => {
		const integration = createCmsIntegration({
			editorConfig: "./src/cms/editor-config.ts",
			shellPath: "admin/",
		});
		expect(integration.shellPath).toBe("/admin");
	});
});
