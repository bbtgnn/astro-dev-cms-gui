/**
 * Runtime: authoring config facade still feeds `compileSemanticIr`.
 */

import { describe, expect, test } from "bun:test";
import { compileSemanticIr, persistedShape } from "@cms/core/semantic";
import { createCmsBuilders } from "../src/config";

describe("createCmsBuilders → compileSemanticIr", () => {
	test("compiles a representative defineCms-shaped tree", () => {
		const s = createCmsBuilders<"posts" | "authors">();
		const config = {
			collections: {
				posts: s.collection({
					loader: s.glob({
						base: "./src/content/posts",
						pattern: "**/*.json",
					}),
					schema: s.tabs([
						s.tab({
							id: "content",
							label: "Content",
							icon: "ContentIcon",
							content: [
								s.field({
									id: "title",
									label: "Title",
									schema: s.string().min(1),
								}),
								s.field({
									id: "body",
									schema: s.string(),
								}).editor("MarkdownEditor", { toolbar: ["bold"] }),
								s.object({
									id: "seo",
									label: "SEO",
									content: [
										s.header({ label: "Meta" }),
										s.field({
											id: "title",
											schema: s.string().max(70),
										}),
										s.separator(),
										s.field({
											id: "description",
											schema: s.string().max(160),
										}),
									],
								}).wrapper("SeoCard"),
								s.field({
									id: "author",
									schema: s.reference("authors"),
								}).editor("AuthorPicker"),
								s.field({
									id: "cover",
									schema: s.image().optional(),
								}),
							],
						}),
					]),
				}),
			},
		};

		const ir = compileSemanticIr(config);
		expect(ir.collections.posts?.loader.kind).toBe("glob");
		expect(ir.persisted.posts?.fields.map((f) => f.id)).toEqual([
			"title",
			"body",
			"seo",
			"author",
			"cover",
		]);

		const seo = ir.persisted.posts?.fields.find((f) => f.id === "seo");
		expect(seo?.schema.kind).toBe("object");
		if (seo?.schema.kind === "object") {
			expect(seo.schema.fields.map((f) => f.id)).toEqual([
				"title",
				"description",
			]);
		}

		const cover = ir.persisted.posts?.fields.find((f) => f.id === "cover");
		expect(cover?.schema).toEqual({
			kind: "optional",
			of: { kind: "image" },
		});

		expect(persistedShape(ir)).toBe(ir.persisted);

		// Opaque bindings preserved on IR tree
		const tabs = ir.collections.posts?.schema;
		expect(tabs?.kind).toBe("tabs");
	});
});
