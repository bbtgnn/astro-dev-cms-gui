/**
 * Internal lowering: stamped Zod schemas (+ form tree) → EditorCollections.
 * Public mount coverage lives in authoring-props.test.ts.
 */
import { describe, expect, test } from "bun:test";
import { createFormTreeHelpers } from "@cms/core/form-tree";
import { CONTENT_FIELD_STAMP } from "@cms/core/semantic";
import { z } from "zod";
import { editorCollectionsFromSchemas } from "./editor-collections";

function stampImage<T extends z.ZodType>(schema: T): T {
	const withMeta = schema.meta({ cms: { kind: "image" as const } }) as T;
	(withMeta as { [key: symbol]: unknown })[CONTENT_FIELD_STAMP] = {
		kind: "image",
	};
	return withMeta;
}

function stampReference<T extends z.ZodType>(schema: T, collection: string): T {
	const withMeta = schema.meta({
		cms: { kind: "reference" as const, collection },
	}) as T;
	(withMeta as { [key: symbol]: unknown })[CONTENT_FIELD_STAMP] = {
		kind: "reference",
		collection,
	};
	return withMeta;
}

describe("editorCollectionsFromSchemas", () => {
	test("projects posts-like stamped schema to EditorCollectionInput with stock editors", () => {
		const posts = z.object({
			title: z.string().min(1),
			cover: stampImage(
				z.object({
					src: z.string(),
					width: z.number(),
					height: z.number(),
					format: z.string(),
				}),
			).optional(),
			author: stampReference(z.string(), "authors"),
		});

		type PostsData = {
			title: string;
			cover?: unknown;
			author: string;
		};
		const { field } = createFormTreeHelpers<PostsData>();

		const editor = editorCollectionsFromSchemas(
			{ posts },
			{},
			{
				forms: {
					posts: [
						field("title").label("Title"),
						field("author").editor("AuthorPickerToken"),
						field("cover"),
					],
				},
			},
		);

		expect(Object.keys(editor)).toEqual(["posts"]);
		const postsEditor = editor.posts;
		expect(postsEditor).toBeDefined();
		if (!postsEditor) throw new Error("missing posts");

		expect(postsEditor.schema.type).toBe("object");
		const props = postsEditor.schema.properties as Record<string, unknown>;
		expect(props.title).toMatchObject({ type: "string", minLength: 1 });
		expect(props.cover).toEqual({ type: "string" });
		expect(props.author).toEqual({ type: "string" });
		expect((props.author as { cms?: unknown }).cms).toBeUndefined();

		expect(postsEditor.uiSchema?.title).toMatchObject({
			"ui:options": { title: "Title" },
		});
		expect(postsEditor.uiSchema?.cover).toMatchObject({
			"ui:components": { textWidget: "imageField" },
		});
		expect(postsEditor.uiSchema?.author).toMatchObject({
			"ui:components": { textWidget: "AuthorPickerToken" },
		});
	});
});
