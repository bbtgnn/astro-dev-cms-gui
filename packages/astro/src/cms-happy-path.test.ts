/**
 * Product cms() happy path after schema-first flip (ticket 05).
 *
 * Seam: astro:config:setup — content-proxy boot, no generate, optional cms.config,
 * shell/host when content.config resolves.
 */
import { afterEach, describe, expect, test } from "bun:test";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cms } from "./integration";
import { cmsHarness } from "./testing";

const temps: string[] = [];

function tempProject(): string {
	const root = mkdtempSync(join(tmpdir(), "cms-happy-path-"));
	temps.push(root);
	mkdirSync(join(root, "src"), { recursive: true });
	return root;
}

afterEach(() => {
	while (temps.length > 0) {
		const root = temps.pop();
		if (root !== undefined) {
			rmSync(root, { recursive: true, force: true });
		}
	}
});

function mockSetupParams(root: string) {
	const calls: {
		updateConfig: unknown[];
		addMiddleware: unknown[];
		injectRoute: unknown[];
	} = {
		updateConfig: [],
		addMiddleware: [],
		injectRoute: [],
	};
	return {
		calls,
		params: {
			config: { root },
			updateConfig: (config: unknown) => {
				calls.updateConfig.push(config);
			},
			addMiddleware: (mw: unknown) => {
				calls.addMiddleware.push(mw);
			},
			injectRoute: (route: unknown) => {
				calls.injectRoute.push(route);
			},
		},
	};
}

function vitePluginsFromCalls(calls: { updateConfig: unknown[] }): unknown[] {
	const plugins: unknown[] = [];
	for (const cfg of calls.updateConfig) {
		const vite = (cfg as { vite?: { plugins?: unknown[] } }).vite;
		if (vite?.plugins) plugins.push(...vite.plugins);
	}
	return plugins;
}

function viteAliasesFromCalls(calls: { updateConfig: unknown[] }): unknown[] {
	const aliases: unknown[] = [];
	for (const cfg of calls.updateConfig) {
		const alias = (cfg as { vite?: { resolve?: { alias?: unknown } } }).vite
			?.resolve?.alias;
		if (Array.isArray(alias)) aliases.push(...alias);
		else if (alias != null) aliases.push(alias);
	}
	return aliases;
}

describe("cms() schema-first setup", () => {
	test("registers content-proxy plugins and astro/loaders alias", async () => {
		const root = tempProject();
		writeFileSync(
			join(root, "src/content.config.ts"),
			`export const collections = {};\n`,
			"utf8",
		);

		const integration = cms();
		const hook = integration.hooks?.["astro:config:setup"];
		if (hook == null) throw new Error("expected setup hook");

		const { params, calls } = mockSetupParams(root);
		await hook(params);

		const plugins = vitePluginsFromCalls(calls);
		expect(
			plugins.some(
				(p) =>
					typeof p === "object" &&
					p != null &&
					"name" in p &&
					(p as { name: string }).name === "@cms/astro:content-proxy",
			),
		).toBe(true);

		const aliases = viteAliasesFromCalls(calls);
		expect(
			aliases.some((a) => {
				if (typeof a !== "object" || a == null || !("find" in a)) return false;
				const find = (a as { find: unknown }).find;
				return find instanceof RegExp
					? find.test("astro/loaders")
					: find === "astro/loaders";
			}),
		).toBe(true);
	});

	test("does not generate content.config when cms.config is present", async () => {
		const root = tempProject();
		const contentConfig = join(root, "src/content.config.ts");
		const handwritten = `export const collections = { keep: true };\n`;
		writeFileSync(contentConfig, handwritten, "utf8");
		writeFileSync(
			join(root, "src/cms.config.ts"),
			`export const forms = {};\nexport function getPreviewUrl() { return null; }\nexport default { forms, getPreviewUrl };\n`,
			"utf8",
		);

		const integration = cms();
		const hook = integration.hooks?.["astro:config:setup"];
		if (hook == null) throw new Error("expected setup hook");

		await hook(mockSetupParams(root).params);

		expect(readFileSync(contentConfig, "utf8")).toBe(handwritten);
		expect(readFileSync(contentConfig, "utf8")).not.toContain(
			"@cms-source-hash:",
		);
	});

	test("missing cms.config still mounts shell and default host when content.config exists", async () => {
		const root = tempProject();
		writeFileSync(
			join(root, "src/content.config.ts"),
			`export const collections = {};\n`,
			"utf8",
		);

		const integration = cms();
		const hook = integration.hooks?.["astro:config:setup"];
		if (hook == null) throw new Error("expected setup hook");

		const { params, calls } = mockSetupParams(root);
		await hook(params);

		expect(integration.shellPath).toBe("/cms");
		expect(calls.injectRoute.length).toBe(2);
		expect(calls.addMiddleware.length).toBe(0);
		const patterns = calls.injectRoute.map(
			(r) => (r as { pattern: string }).pattern,
		);
		expect(patterns).toContain("/cms");
		expect(patterns).toContain("/cms/api/[...path]");
	});

	test("hard-fails when content.config is missing", async () => {
		const root = tempProject();

		const integration = cms();
		const hook = integration.hooks?.["astro:config:setup"];
		if (hook == null) throw new Error("expected setup hook");

		await expect(hook(mockSetupParams(root).params)).rejects.toThrow(
			/content\.config/,
		);
	});

	test("loads cms.config virtual when file exists", async () => {
		const root = tempProject();
		writeFileSync(
			join(root, "src/content.config.ts"),
			`export const collections = {};\n`,
			"utf8",
		);
		writeFileSync(
			join(root, "src/cms.config.ts"),
			`export const forms = {};\nexport function getPreviewUrl() { return null; }\nexport default { forms, getPreviewUrl };\n`,
			"utf8",
		);

		const integration = cms();
		const hook = integration.hooks?.["astro:config:setup"];
		if (hook == null) throw new Error("expected setup hook");

		const { params, calls } = mockSetupParams(root);
		await hook(params);

		const plugins = vitePluginsFromCalls(calls);
		expect(
			plugins.some(
				(p) =>
					typeof p === "object" &&
					p != null &&
					"name" in p &&
					(p as { name: string }).name === "@cms/astro:virtual-config",
			),
		).toBe(true);
	});
});

describe("cmsHarness escapes", () => {
	test("generate option is a no-op (never writes content.config)", async () => {
		const root = tempProject();
		writeFileSync(
			join(root, "src/cms.config.ts"),
			`export const forms = {};\nexport default { forms };\n`,
			"utf8",
		);

		const integration = cmsHarness({
			shellPath: false,
			host: false,
			generate: true as unknown as false,
		});
		const hook = integration.hooks?.["astro:config:setup"];
		if (hook == null) throw new Error("expected setup hook");

		await hook(mockSetupParams(root).params);
		expect(existsSync(join(root, "src/content.config.ts"))).toBe(false);
	});

	test("skips shell when content.config is missing (no requireContentConfig)", async () => {
		const root = tempProject();

		const integration = cmsHarness({
			host: false,
		});
		const hook = integration.hooks?.["astro:config:setup"];
		if (hook == null) throw new Error("expected setup hook");

		const { params, calls } = mockSetupParams(root);
		await hook(params);

		expect(calls.injectRoute.length).toBe(0);
		expect(integration.shellPath).toBeUndefined();
	});
});
