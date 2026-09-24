/**
 * Content-proxy seams: stamped loaders + image/ref kinds after shim / boot wrap.
 * Host/Node only — never imported from the browser authoring shell.
 */
import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	astroContentBootProxy,
	viteAliasesForBoot,
	vitePluginsForBoot,
} from "../src/content-proxy/boot";
import {
	getContentFieldStamp,
	stampImageSchema,
	stampRelationSchema,
} from "../src/content-proxy/stamp-helpers";
import { getLoaderStamp } from "../src/content-proxy/stamps";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "..");

describe("astro/loaders shim stamps", () => {
	test("glob stamps kind, base, and pattern; real loader still loads", async () => {
		const { glob } = await import("../src/content-proxy/shims/astro-loaders");
		const loader = glob({
			pattern: "**/*.json",
			base: "./src/content/posts",
		});
		expect(loader.name).toBe("glob-loader");
		expect(typeof loader.load).toBe("function");
		expect(getLoaderStamp(loader)).toEqual({
			kind: "glob",
			pattern: "**/*.json",
			base: "./src/content/posts",
		});
	});

	test("file stamps kind and fileName", async () => {
		const { file } = await import("../src/content-proxy/shims/astro-loaders");
		const loader = file("./src/content/settings.json");
		expect(loader.name).toBe("file-loader");
		expect(getLoaderStamp(loader)).toEqual({
			kind: "file",
			fileName: "./src/content/settings.json",
		});
	});

	test("URL base normalizes to string href", async () => {
		const { glob } = await import("../src/content-proxy/shims/astro-loaders");
		const base = new URL("file:///tmp/content/posts/");
		const loader = glob({ pattern: "*.json", base });
		expect(getLoaderStamp(loader)?.kind).toBe("glob");
		if (getLoaderStamp(loader)?.kind !== "glob") return;
		expect(getLoaderStamp(loader)?.base).toBe(base.href);
	});
});

describe("image / reference content-field stamps", () => {
	test("stampRelationSchema attaches reference stamp and keeps parse", async () => {
		const require = createRequire(path.join(packageRoot, "package.json"));
		// Prefer consumer zod (via astro peer graph) for Standard Schema Input.
		const zodEntry = require.resolve("zod", {
			paths: [path.dirname(require.resolve("astro/package.json"))],
		});
		const { z } = await import(zodEntry);
		const base = z.string();
		const stamped = stampRelationSchema(base, "authors");
		expect(getContentFieldStamp(stamped)).toEqual({
			kind: "reference",
			collection: "authors",
		});
		expect(stamped.safeParse("ada").success).toBe(true);
		expect(stamped.safeParse(1).success).toBe(false);
	});

	test("stampImageSchema attaches image stamp and keeps parse", async () => {
		const require = createRequire(path.join(packageRoot, "package.json"));
		const zodEntry = require.resolve("zod", {
			paths: [path.dirname(require.resolve("astro/package.json"))],
		});
		const { z } = await import(zodEntry);
		const base = z.object({
			src: z.string(),
			width: z.number(),
			height: z.number(),
			format: z.string(),
		});
		const stamped = stampImageSchema(base);
		expect(getContentFieldStamp(stamped)).toEqual({ kind: "image" });
		expect(
			stamped.safeParse({
				src: "./cover.jpg",
				width: 10,
				height: 10,
				format: "jpg",
			}).success,
		).toBe(true);
	});
});

describe("mini content.config via shim", () => {
	test("collections export carries loader stamps", async () => {
		const { collections } = await import("./fixtures/mini-content.config.ts");
		const posts = collections.posts;
		const settings = collections.settings;
		expect(getLoaderStamp(posts.loader)).toEqual({
			kind: "glob",
			pattern: "**/*.json",
			base: "./src/content/posts",
		});
		expect(getLoaderStamp(settings.loader)).toEqual({
			kind: "file",
			fileName: "./src/content/settings.json",
		});
		expect(getContentFieldStamp(posts.schema.shape.author)).toEqual({
			kind: "reference",
			collection: "authors",
		});
		expect(getContentFieldStamp(posts.schema.shape.cover)).toEqual({
			kind: "image",
		});
	});
});

describe("Vite boot proxy", () => {
	test("enforce pre and aliases target loaders shim", () => {
		const plugins = vitePluginsForBoot();
		expect(plugins).toHaveLength(1);
		expect(plugins[0]?.enforce).toBe("pre");
		const resolveHook = plugins[0]?.resolveId;
		expect(typeof resolveHook).toBe("object");
		expect(
			resolveHook && typeof resolveHook === "object" && "order" in resolveHook
				? resolveHook.order
				: undefined,
		).toBe("pre");
		const aliases = viteAliasesForBoot();
		expect(aliases).toHaveLength(1);
		expect(aliases[0]?.find).toEqual(/^astro\/loaders$/);
		expect(aliases[0]?.replacement).toContain("astro-loaders");
	});

	test("resolveId remaps astro:content; load wraps reference and image", async () => {
		const plugin = astroContentBootProxy();
		const realId = "/virtual/astro-content-real.js";
		const resolveId = plugin.resolveId;
		if (typeof resolveId !== "object" || resolveId == null) {
			throw new Error("expected object resolveId hook");
		}
		const resolved = await resolveId.handler.call(
			{
				resolve: async () => ({ id: realId }),
			},
			"astro:content",
			"/project/src/content.config.ts",
			{},
		);
		expect(resolved).toBe("\0@cms/astro/astro-content-proxy");
		const source = plugin.load(resolved as string);
		expect(source).toContain("stampRelationSchema");
		expect(source).toContain("stampImageSchema");
		expect(source).toContain("export function reference");
		expect(source).toContain("export function defineCollection");
		expect(source).toContain(JSON.stringify(realId));
	});

	test("resolveId remaps \\0astro:content (Astro resolved virtual id)", async () => {
		const plugin = astroContentBootProxy();
		const resolveId = plugin.resolveId;
		if (typeof resolveId !== "object" || resolveId == null) {
			throw new Error("expected object resolveId hook");
		}
		let resolveCalled = false;
		const resolved = await resolveId.handler.call(
			{
				resolve: async () => {
					resolveCalled = true;
					return { id: "should-not-be-used" };
				},
			},
			"\0astro:content",
			"/project/src/content.config.ts",
			{},
		);
		expect(resolved).toBe("\0@cms/astro/astro-content-proxy");
		expect(resolveCalled).toBe(false);
		const source = plugin.load(resolved as string);
		expect(source).toContain("stampRelationSchema");
		expect(source).toContain(JSON.stringify("\0astro:content"));
	});

	test("resolveId identity-resolves \\0astro:content when importer is the proxy", async () => {
		const plugin = astroContentBootProxy();
		const resolveId = plugin.resolveId;
		if (typeof resolveId !== "object" || resolveId == null) {
			throw new Error("expected object resolveId hook");
		}
		const resolved = await resolveId.handler.call(
			{
				resolve: async () => ({ id: "unused" }),
			},
			"\0astro:content",
			"\0@cms/astro/astro-content-proxy",
			{},
		);
		expect(resolved).toBe("\0astro:content");
	});
});
