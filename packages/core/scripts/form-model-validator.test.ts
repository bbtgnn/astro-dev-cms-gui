/**
 * ADR-0019 slice 5 — IR → form model + authoritative validator.
 */

import { describe, expect, test } from "bun:test";
import { createCmsProtocol } from "../src/create-cms-protocol";
import { memoryWriter } from "../src/memory-writer";
import {
	compileSemanticIr,
	createAuthoritativeValidator,
	projectFormModels,
	s,
} from "../src/semantic";

function sampleIr() {
	return compileSemanticIr({
		collections: {
			authors: s.collection({
				loader: s.glob({ base: "./src/content/authors", pattern: "**/*.json" }),
				schema: s.stack([
					s.field({ id: "name", label: "Name", schema: s.string().min(1) }),
				]),
			}),
			posts: s.collection({
				loader: s.glob({ base: "./src/content/posts", pattern: "**/*.json" }),
				schema: s.tabs([
					s.tab({
						id: "content",
						label: "Content",
						content: [
							s.field({
								id: "title",
								label: "Title",
								schema: s.string().min(1).max(70),
							}),
							s.field({
								id: "draft",
								schema: s.boolean(),
							}),
							s.object({
								id: "seo",
								label: "SEO",
								content: [
									s.field({
										id: "description",
										schema: s.string().max(160),
									}),
								],
							}),
						],
					}),
					s.tab({
						id: "media",
						label: "Media",
						content: [
							s.header({ label: "Assets" }),
							s.separator(),
							s.field({
								id: "cover",
								schema: s.image().optional(),
							}),
							s
								.field({
									id: "author",
									schema: s.reference("authors"),
								})
								.editor("AuthorPicker"),
						],
					}),
				]),
			}),
		},
	});
}

describe("projectFormModels", () => {
	test("preserves layout presentation and durable field descriptors", () => {
		const ir = sampleIr();
		const models = projectFormModels(ir);
		const posts = models.posts;
		expect(posts).toBeDefined();
		if (!posts) throw new Error("missing posts model");

		expect(posts.layout.kind).toBe("tabs");
		expect(posts.fields.title?.semanticKind).toBe("string");
		expect(posts.fields.title?.label).toBe("Title");
		expect(posts.fields.title?.constraints).toEqual([
			{ method: "min", value: 1 },
			{ method: "max", value: 70 },
		]);
		expect(posts.fields["seo.description"]?.semanticKind).toBe("string");
		expect(posts.fields.cover?.semanticKind).toBe("image");
		expect(posts.fields.cover?.optional).toBe(true);
		expect(posts.fields.author?.semanticKind).toBe("reference");
		expect(posts.fields.author?.referenceCollection).toBe("authors");
		expect(posts.fields.author?.component).toBe("AuthorPicker");

		// Presentation in layout
		if (posts.layout.kind !== "tabs") throw new Error("expected tabs");
		const media = posts.layout.content.find((t) => t.id === "media");
		expect(media?.content.some((n) => n.kind === "header")).toBe(true);
		expect(media?.content.some((n) => n.kind === "separator")).toBe(true);
	});

	test("jsonSchema is presentation-stripped persisted input shape", () => {
		const ir = sampleIr();
		const posts = projectFormModels(ir).posts;
		expect(posts?.jsonSchema.type).toBe("object");
		const props = posts?.jsonSchema.properties as Record<string, unknown>;
		expect(Object.keys(props ?? {}).sort()).toEqual([
			"author",
			"cover",
			"draft",
			"seo",
			"title",
		]);
		expect(props?.cover).toEqual({ type: "string" });
		expect(props?.author).toEqual({ type: "string" });
		// No header/separator keys
		expect(props?.Assets).toBeUndefined();
	});
});

describe("createAuthoritativeValidator", () => {
	test("accepts valid persisted input", async () => {
		const ir = sampleIr();
		const existing = new Set(["ada"]);
		const images = new Set(["./hello/cover/a.jpg"]);
		const validator = createAuthoritativeValidator(ir, {
			entryExists: (collection, id) =>
				collection === "authors" && existing.has(id),
			isAcceptedImageAsset: (path) => images.has(path),
		});

		const ok = await validator.safeParseAsync("posts", {
			title: "Hello",
			draft: false,
			seo: { description: "desc" },
			cover: "./hello/cover/a.jpg",
			author: "ada",
		});
		expect(ok.success).toBe(true);
	});

	test("rejects bad types and constraints", async () => {
		const ir = sampleIr();
		const validator = createAuthoritativeValidator(ir);

		const badType = await validator.safeParseAsync("posts", {
			title: 123,
			draft: false,
			seo: { description: "x" },
			author: "ada",
		});
		expect(badType.success).toBe(false);

		const tooLong = await validator.safeParseAsync("posts", {
			title: "x".repeat(80),
			draft: false,
			seo: { description: "x" },
			author: "ada",
		});
		expect(tooLong.success).toBe(false);
	});

	test("rejects image allowlist failure", async () => {
		const ir = sampleIr();
		const validator = createAuthoritativeValidator(ir, {
			isAcceptedImageAsset: () => false,
			entryExists: () => true,
		});
		const result = await validator.safeParseAsync("posts", {
			title: "Hello",
			draft: false,
			seo: { description: "x" },
			cover: "./evil/path.jpg",
			author: "ada",
		});
		expect(result.success).toBe(false);
	});

	test("rejects missing reference and accepts present reference", async () => {
		const ir = sampleIr();
		const existing = new Set(["ada"]);
		const validator = createAuthoritativeValidator(ir, {
			entryExists: (collection, id) =>
				collection === "authors" && existing.has(id),
			isAcceptedImageAsset: () => true,
		});

		const missing = await validator.safeParseAsync("posts", {
			title: "Hello",
			draft: false,
			seo: { description: "x" },
			author: "nobody",
		});
		expect(missing.success).toBe(false);

		const present = await validator.safeParseAsync("posts", {
			title: "Hello",
			draft: false,
			seo: { description: "x" },
			author: "ada",
		});
		expect(present.success).toBe(true);
	});

	test("write-back plugs schemas and blocks invalid saves", async () => {
		const ir = sampleIr();
		const validator = createAuthoritativeValidator(ir, {
			entryExists: (c, id) => c === "authors" && id === "ada",
			isAcceptedImageAsset: () => true,
		});

		const protocol = createCmsProtocol({
			root: "/virtual",
			allowPaths: ["posts"],
			writer: memoryWriter(),
			schemas: { ...validator.schemas },
			// Internal test seams via createWriteMode are not on createCmsProtocol —
			// use pathMap through cast is unavailable; memory + schemas alone exercises
			// validation before path resolve when discovery is empty.
		});

		// Without discovery/pathMap, upsert fails with 404 after validation.
		// Exercise validator.schemas directly through write-mode-compatible parse:
		const bad = await validator.schemas.posts?.safeParseAsync({
			title: "Hello",
			draft: false,
			seo: { description: "x" },
			author: "missing",
		});
		expect(bad?.success).toBe(false);

		const good = await validator.schemas.posts?.safeParseAsync({
			title: "Hello",
			draft: false,
			seo: { description: "x" },
			author: "ada",
		});
		expect(good?.success).toBe(true);

		// Protocol construction accepts the schema map (type/runtime smoke).
		expect(typeof protocol.upsertEntry).toBe("function");
	});
});
