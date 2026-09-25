import { describe, expect, test } from "bun:test";
import path from "node:path";
import {
	CMS_COMPONENTS_VIRTUAL_ID,
	CMS_CONFIG_VIRTUAL_ID,
	CMS_HOST_VIRTUAL_ID,
	CMS_INTEGRATION_OPTIONS_VIRTUAL_ID,
	cmsComponentsVitePlugin,
	cmsConfigVitePlugin,
	cmsHarness,
	cmsHostVitePlugin,
	cmsIntegrationOptionsVitePlugin,
	DEFAULT_CONTENT_ROOT,
	resolveProjectEntry,
} from "../testing";
import { cms } from "./integration";

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
	test("soft-binds overlay exports from cms.config entry", async () => {
		const entry = path.resolve("/project/src/cms.config.ts");
		const plugin = cmsConfigVitePlugin({ entry });
		const resolved = await plugin.resolveId(CMS_CONFIG_VIRTUAL_ID);
		expect(resolved).toBe(`\0${CMS_CONFIG_VIRTUAL_ID}`);
		if (resolved == null) throw new Error("expected resolved id");
		const source = await plugin.load(resolved);
		expect(source).toContain(`from ${JSON.stringify(entry)}`);
		expect(source).toContain("__cfg = __cmsConfig.default ?? __cmsConfig");
		expect(source).toContain("export const forms =");
		expect(source).toContain("export const getPreviewUrl =");
		expect(source).toContain("export const types =");
	});

	test("emits stub forms when entry omitted", async () => {
		const plugin = cmsConfigVitePlugin({});
		const resolved = await plugin.resolveId(CMS_CONFIG_VIRTUAL_ID);
		expect(resolved).toBe(`\0${CMS_CONFIG_VIRTUAL_ID}`);
		if (resolved == null) throw new Error("expected resolved id");
		const source = await plugin.load(resolved);
		expect(source).toContain("export const forms = {};");
		expect(source).toContain("export const types = {};");
		expect(source).toContain("export function getPreviewUrl");
	});
});

describe("cmsComponentsVitePlugin", () => {
	test("re-exports catalog default export", async () => {
		const entry = path.resolve("/project/src/cms.components.ts");
		const plugin = cmsComponentsVitePlugin({ entry });
		const resolved = await plugin.resolveId(CMS_COMPONENTS_VIRTUAL_ID);
		expect(resolved).toBe(`\0${CMS_COMPONENTS_VIRTUAL_ID}`);
		if (resolved == null) throw new Error("expected resolved id");
		const source = await plugin.load(resolved);
		expect(source).toBe(`export { default } from ${JSON.stringify(entry)};\n`);
	});

	test("emits empty catalog when entry omitted", async () => {
		const plugin = cmsComponentsVitePlugin({});
		const resolved = await plugin.resolveId(CMS_COMPONENTS_VIRTUAL_ID);
		expect(resolved).toBe(`\0${CMS_COMPONENTS_VIRTUAL_ID}`);
		if (resolved == null) throw new Error("expected resolved id");
		const source = await plugin.load(resolved);
		expect(source).toBe("export default {};\n");
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
	test("emits mount, allowInProd, and contentRoot literals", async () => {
		const contentRoot = path.resolve("/project", DEFAULT_CONTENT_ROOT);
		const plugin = cmsIntegrationOptionsVitePlugin({
			mount: "/cms/api",
			allowInProd: false,
			contentRoot,
		});
		const resolved = await plugin.resolveId(CMS_INTEGRATION_OPTIONS_VIRTUAL_ID);
		expect(resolved).toBe(`\0${CMS_INTEGRATION_OPTIONS_VIRTUAL_ID}`);
		if (resolved == null) throw new Error("expected resolved id");
		const source = await plugin.load(resolved);
		expect(source).toContain('export const mount = "/cms/api";');
		expect(source).toContain("export const allowInProd = false;");
		expect(source).toContain(
			`export const contentRoot = ${JSON.stringify(contentRoot)};`,
		);
	});
});

describe("cms() product face", () => {
	test("defaults to /cms with zero args", () => {
		const integration = cms();
		expect(integration.shellPath).toBe("/cms");
		expect(integration.name).toBe("@cms/astro");
	});
});

describe("cmsHarness escapes", () => {
	test("shellPath false skips inject", () => {
		const integration = cmsHarness({
			shellPath: false,
		});
		expect(integration.shellPath).toBeUndefined();
	});

	test("normalizes custom shellPath", () => {
		const integration = cmsHarness({
			shellPath: "admin/",
		});
		expect(integration.shellPath).toBe("/admin");
	});
});
