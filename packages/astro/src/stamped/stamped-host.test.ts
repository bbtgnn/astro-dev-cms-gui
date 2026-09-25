/**
 * FS host from stamped content.config collections (schema-first overlay ticket 04).
 * Shims active via fixture imports; memoryWriter mirrors authors/posts layout.
 */
import { describe, expect, test } from "bun:test";
import path from "node:path";
import { memoryWriter } from "@cms/core";
import { z } from "zod";
import { file, glob } from "../content-proxy/shims/astro-loaders";
import {
	stampImageSchema,
	stampRelationSchema,
} from "../content-proxy/stamp-helpers";
import {
	assembleStampedCms,
	buildFsHostFromStampedCollections,
	collectionsFromContentConfigExport,
} from "../testing.ts";

const contentRoot = path.resolve("/cms-stamped-fs-host-test");

describe("collectionsFromContentConfigExport", () => {
	test("loads shimmed authors/posts and preserves loader stamps", async () => {
		const mod = await import("../fixtures/authors-posts-content.config.ts");
		const loaded = collectionsFromContentConfigExport(mod);
		expect(Object.keys(loaded).sort()).toEqual(["authors", "posts"]);
		expect(loaded.posts?.schema).toBeDefined();
		expect(loaded.authors?.schema).toBeDefined();
	});
});

describe("buildFsHostFromStampedCollections", () => {
	test("lists collections and maps glob base to contentRoot-relative write folder", async () => {
		const mod = await import("../fixtures/authors-posts-content.config.ts");
		const writer = memoryWriter();
		await writer.writeText(
			path.join(contentRoot, "authors", "ada.json"),
			JSON.stringify({ name: "Ada" }),
		);

		const { host, stampedSchemas } = buildFsHostFromStampedCollections({
			collections: collectionsFromContentConfigExport(mod),
			contentRoot,
			writer,
			fileExists: () => false,
		});

		const listed = await host.protocol.listCollections();
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.value.map((c) => c.name).sort()).toEqual([
			"authors",
			"posts",
		]);

		const ok = await host.protocol.upsertEntry({
			collection: "posts",
			id: "hello",
			data: { title: "Hello", author: "ada" },
			expectedRevision: null,
		});
		expect(ok.ok).toBe(true);
		expect(
			writer.store.has(path.join(contentRoot, "posts", "hello.json")),
		).toBe(true);

		// Form-projection seam (ticket 03): stamped schemas stay available.
		expect(stampedSchemas.posts).toBeDefined();
		expect(stampedSchemas.authors).toBeDefined();
	});

	test("authoritative validate accepts image/ref Input paths and ids, not Output objects", async () => {
		const mod = await import("../fixtures/authors-posts-content.config.ts");
		const writer = memoryWriter();
		await writer.writeText(
			path.join(contentRoot, "authors", "ada.json"),
			JSON.stringify({ name: "Ada" }),
		);
		const accepted = new Set([
			path.join(contentRoot, "posts", "cover", "photo.jpg"),
		]);

		const { host } = buildFsHostFromStampedCollections({
			collections: collectionsFromContentConfigExport(mod),
			contentRoot,
			writer,
			fileExists: (abs) => accepted.has(abs),
		});

		const badRef = await host.protocol.upsertEntry({
			collection: "posts",
			id: "bad-ref",
			data: { title: "Hello", author: "nobody" },
			expectedRevision: null,
		});
		expect(badRef.ok).toBe(false);
		if (!badRef.ok) expect(badRef.code).toBe("validation_failed");

		const badImageShape = await host.protocol.upsertEntry({
			collection: "posts",
			id: "bad-cover",
			data: {
				title: "Hello",
				author: "ada",
				cover: {
					src: "./cover/photo.jpg",
					width: 10,
					height: 10,
					format: "jpg",
				},
			},
			expectedRevision: null,
		});
		expect(badImageShape.ok).toBe(false);
		if (!badImageShape.ok) expect(badImageShape.code).toBe("validation_failed");

		const ok = await host.protocol.upsertEntry({
			collection: "posts",
			id: "with-cover",
			data: {
				title: "Hello",
				author: "ada",
				cover: "./cover/photo.jpg",
			},
			expectedRevision: null,
		});
		expect(ok.ok).toBe(true);
		const raw = writer.store.get(
			path.join(contentRoot, "posts", "with-cover.json"),
		);
		expect(raw).toBeDefined();
		const parsed = JSON.parse(raw as string) as {
			cover: unknown;
			author: unknown;
		};
		// Persist Input, not transformed Output (ADR-0010).
		expect(parsed.cover).toBe("./cover/photo.jpg");
		expect(parsed.author).toBe("ada");
	});

	test("file() collections are explicitly unsupported", () => {
		const collections = {
			settings: {
				loader: file("./src/content/settings.json"),
				schema: z.object({ siteName: z.string() }),
			},
		};
		expect(() =>
			buildFsHostFromStampedCollections({
				collections,
				contentRoot,
				writer: memoryWriter(),
				fileExists: () => false,
			}),
		).toThrow(/file\(\)|unsupported/i);
	});

	test("missing loader stamp fails closed unless explicit location is provided", () => {
		const unstamped = {
			posts: {
				loader: { name: "custom-loader", load: async () => {} },
				schema: z.object({ title: z.string() }),
			},
		};
		expect(() =>
			buildFsHostFromStampedCollections({
				collections: unstamped,
				contentRoot,
				writer: memoryWriter(),
				fileExists: () => false,
			}),
		).toThrow(/stamp|location/i);

		const { host } = buildFsHostFromStampedCollections({
			collections: unstamped,
			contentRoot,
			writer: memoryWriter(),
			fileExists: () => false,
			locations: { posts: { base: "posts" } },
		});
		expect(host).toBeDefined();
	});

	test("object-shaped stamped image still validates as path Input", async () => {
		// Astro JSON types often look like metadata Output; stamps force Input rewrite.
		const collections = {
			posts: {
				loader: glob({
					pattern: "**/*.json",
					base: "./src/content/posts",
				}),
				schema: z.object({
					title: z.string().min(1),
					cover: stampImageSchema(
						z.object({
							src: z.string(),
							width: z.number(),
							height: z.number(),
							format: z.string(),
						}),
					).optional(),
					author: stampRelationSchema(z.string(), "authors"),
				}),
			},
			authors: {
				loader: glob({
					pattern: "**/*.json",
					base: "./src/content/authors",
				}),
				schema: z.object({ name: z.string().min(1) }),
			},
		};
		const writer = memoryWriter();
		await writer.writeText(
			path.join(contentRoot, "authors", "ada.json"),
			JSON.stringify({ name: "Ada" }),
		);
		const { host } = buildFsHostFromStampedCollections({
			collections,
			contentRoot,
			writer,
			fileExists: () => true,
		});
		const ok = await host.protocol.upsertEntry({
			collection: "posts",
			id: "path-cover",
			data: {
				title: "Hello",
				author: "ada",
				cover: "./x.jpg",
			},
			expectedRevision: null,
		});
		expect(ok.ok).toBe(true);
	});
});

describe("assembleStampedCms", () => {
	test("pairs host collection names with form model keys from one stamped graph", async () => {
		const mod = await import("../fixtures/authors-posts-content.config.ts");
		const writer = memoryWriter();
		await writer.writeText(
			path.join(contentRoot, "authors", "ada.json"),
			JSON.stringify({ name: "Ada" }),
		);

		const { host, formModels } = assembleStampedCms({
			collections: collectionsFromContentConfigExport(mod),
			contentRoot,
			writer,
			fileExists: () => false,
		});

		const listed = await host.protocol.listCollections();
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		const hostNames = listed.value.map((c) => c.name).sort();
		expect(hostNames).toEqual(["authors", "posts"]);
		expect(Object.keys(formModels).sort()).toEqual(hostNames);
		expect(formModels.posts?.collectionId).toBe("posts");
		expect(formModels.authors?.collectionId).toBe("authors");
	});
});
