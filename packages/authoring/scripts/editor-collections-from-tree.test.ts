/**
 * Mount seam: unified tree + catalog → EditorCollections.
 */

import { describe, expect, test } from "bun:test";
import { s } from "@cms/core/semantic";
import { editorCollectionsFromTree } from "../src/form/editor-collections";

describe("editorCollectionsFromTree", () => {
	test("compiles tree and resolves catalog bindings into EditorCollections", () => {
		const collections = {
			posts: s.collection({
				loader: s.glob({ base: "./posts", pattern: "**/*.json" }),
				schema: s.stack([
					s.field({
						id: "title",
						label: "Title",
						schema: s.string().min(1),
					}),
					s.field({
						id: "author",
						schema: s.reference("authors"),
					}).editor("AuthorPickerToken"),
				]),
			}),
		};
		const live = {
			AuthorPickerToken: { name: "LiveAuthorPicker" },
		};

		const editor = editorCollectionsFromTree(collections, live);

		expect(Object.keys(editor)).toEqual(["posts"]);
		const posts = editor.posts;
		expect(posts).toBeDefined();
		if (!posts) throw new Error("missing posts");

		expect(posts.schema.type).toBe("object");
		const props = posts.schema.properties as Record<string, unknown>;
		expect(props.title).toMatchObject({ type: "string", minLength: 1 });

		expect(posts.uiSchema?.title).toMatchObject({
			"ui:options": { title: "Title" },
		});
		expect(posts.uiSchema?.author).toMatchObject({
			"ui:components": { textWidget: live.AuthorPickerToken },
		});
	});
});
