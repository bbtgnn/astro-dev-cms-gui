/**
 * CMS-first default host helpers (ADR-0019 slice 6) + pure builder (candidate #3).
 */

import { describe, expect, test } from "bun:test";
import path from "node:path";
import { memoryWriter } from "@cms/core";
import { s } from "@cms/core/semantic";
import { buildDefaultFsHost } from "../src/build-default-fs-host.ts";
import { writeBaseFromGlob } from "../src/write-base-from-glob.ts";

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

describe("writeBaseFromGlob", () => {
	test("uses last path segment of Astro project-relative glob base", () => {
		expect(writeBaseFromGlob("./src/content/posts", "posts")).toBe("posts");
		expect(writeBaseFromGlob("./src/content/authors", "authors")).toBe(
			"authors",
		);
	});

	test("falls back to collection id when base is empty-ish", () => {
		expect(writeBaseFromGlob(".", "posts")).toBe("posts");
		expect(writeBaseFromGlob("", "authors")).toBe("authors");
	});
});

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
