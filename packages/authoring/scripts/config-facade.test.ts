/**
 * Runtime: authoring config facade still feeds `compileSemanticIr`.
 */

import { describe, expect, test } from "bun:test";
import {
	compileSemanticIr,
	persistedProjections,
	projectFormModels,
} from "@cms/core/semantic";
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
								s
									.field({
										id: "body",
										schema: s.string(),
									})
									.editor("MarkdownEditor", { toolbar: ["bold"] }),
								s
									.object({
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
									})
									.wrapper("SeoCard"),
								s
									.field({
										id: "author",
										schema: s.reference("authors"),
									})
									.editor("AuthorPicker"),
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

		const props = persistedProjections(ir).jsonSchemas().posts
			?.properties as Record<string, unknown>;
		expect(Object.keys(props ?? {}).sort()).toEqual([
			"author",
			"body",
			"cover",
			"seo",
			"title",
		]);
		expect(props?.seo).toMatchObject({
			type: "object",
			properties: {
				title: expect.anything(),
				description: expect.anything(),
			},
		});

		expect(projectFormModels(ir).posts).toBeDefined();

		// Opaque bindings preserved on IR tree
		const tabs = ir.collections.posts?.schema;
		expect(tabs?.kind).toBe("tabs");
	});
});
