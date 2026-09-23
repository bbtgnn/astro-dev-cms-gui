/**
 * Package-default CmsHost assembly via `@cms/astro/testing` (ADR-0016 / 0019).
 */

import { describe, expect, test } from "bun:test";
import path from "node:path";
import { memoryWriter } from "@cms/core";
import { s } from "@cms/core/semantic";
import { buildDefaultFsHost } from "../src/testing.ts";

const fixtureCollections = {
	posts: s.collection({
		loader: s.glob({
			base: "./src/content/posts",
			pattern: "**/*.json",
		}),
		schema: s.stack([
			s.field({ id: "title", schema: s.string().min(1) }),
			s.field({ id: "cover", schema: s.image().optional() }),
			s.field({ id: "author", schema: s.reference("authors") }),
		]),
	}),
	authors: s.collection({
		loader: s.glob({
			base: "./src/content/authors",
			pattern: "**/*.json",
		}),
		schema: s.field({ id: "name", schema: s.string().min(1) }),
	}),
};

/** Empty-ish glob base falls back to collection id for the write folder. */
const fallbackBaseCollections = {
	posts: s.collection({
		loader: s.glob({ base: ".", pattern: "**/*.json" }),
		schema: s.field({ id: "title", schema: s.string().min(1) }),
	}),
};

describe("buildDefaultFsHost", () => {
	const contentRoot = path.resolve("/cms-default-fs-host-test");

	test("lists collections from IR glob bases", async () => {
		const host = buildDefaultFsHost({
			collections: fixtureCollections,
			contentRoot,
			writer: memoryWriter(),
			fileExists: () => false,
		});
		const listed = await host.protocol.listCollections();
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.value.map((c) => c.name).sort()).toEqual([
			"authors",
			"posts",
		]);
	});

	test("maps project-relative glob base to contentRoot-relative write folder", async () => {
		const writer = memoryWriter();
		await writer.writeText(
			path.join(contentRoot, "authors", "ada.json"),
			JSON.stringify({ name: "Ada" }),
		);
		const host = buildDefaultFsHost({
			collections: fixtureCollections,
			contentRoot,
			writer,
			fileExists: () => false,
		});
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
	});

	test("falls back to collection id when glob base is empty-ish", async () => {
		const writer = memoryWriter();
		const host = buildDefaultFsHost({
			collections: fallbackBaseCollections,
			contentRoot,
			writer,
			fileExists: () => false,
		});
		const ok = await host.protocol.upsertEntry({
			collection: "posts",
			id: "fallback",
			data: { title: "Hi" },
			expectedRevision: null,
		});
		expect(ok.ok).toBe(true);
		expect(
			writer.store.has(path.join(contentRoot, "posts", "fallback.json")),
		).toBe(true);
	});

	test("entryExists accepts ids found under collection base", async () => {
		const writer = memoryWriter();
		await writer.writeText(
			path.join(contentRoot, "authors", "ada.json"),
			JSON.stringify({ name: "Ada" }),
		);

		const host = buildDefaultFsHost({
			collections: fixtureCollections,
			contentRoot,
			writer,
			fileExists: () => true,
		});

		const missing = await host.protocol.upsertEntry({
			collection: "posts",
			id: "hello",
			data: { title: "Hello", author: "nobody" },
			expectedRevision: null,
		});
		expect(missing.ok).toBe(false);
		if (!missing.ok) expect(missing.code).toBe("validation_failed");

		const present = await host.protocol.upsertEntry({
			collection: "posts",
			id: "hello",
			data: { title: "Hello", author: "ada" },
			expectedRevision: null,
		});
		expect(present.ok).toBe(true);
	});

	test("isAcceptedImageAsset uses fileExists under allowlisted bases", async () => {
		const writer = memoryWriter();
		await writer.writeText(
			path.join(contentRoot, "authors", "ada.json"),
			JSON.stringify({ name: "Ada" }),
		);

		const accepted = new Set([
			path.join(contentRoot, "posts", "cover", "photo.jpg"),
		]);

		const host = buildDefaultFsHost({
			collections: fixtureCollections,
			contentRoot,
			writer,
			fileExists: (abs) => accepted.has(abs),
		});

		const rejected = await host.protocol.upsertEntry({
			collection: "posts",
			id: "with-cover",
			data: {
				title: "Hello",
				author: "ada",
				cover: "./missing.jpg",
			},
			expectedRevision: null,
		});
		expect(rejected.ok).toBe(false);
		if (!rejected.ok) expect(rejected.code).toBe("validation_failed");

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
	});

	test("rejects unsafe image relative paths without calling fileExists", async () => {
		const writer = memoryWriter();
		await writer.writeText(
			path.join(contentRoot, "authors", "ada.json"),
			JSON.stringify({ name: "Ada" }),
		);
		let fileExistsCalls = 0;

		const host = buildDefaultFsHost({
			collections: fixtureCollections,
			contentRoot,
			writer,
			fileExists: () => {
				fileExistsCalls += 1;
				return true;
			},
		});

		const result = await host.protocol.upsertEntry({
			collection: "posts",
			id: "evil",
			data: {
				title: "Hello",
				author: "ada",
				cover: "../etc/passwd",
			},
			expectedRevision: null,
		});
		expect(result.ok).toBe(false);
		expect(fileExistsCalls).toBe(0);
	});
});
