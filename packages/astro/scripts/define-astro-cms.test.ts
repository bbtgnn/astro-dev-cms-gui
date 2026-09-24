/**
 * Host facade: `defineAstroCms(options)` presentation-only face.
 */

import { describe, expect, test } from "bun:test";
import { defineAstroCms } from "../src/config.ts";

describe("defineAstroCms", () => {
	test("normalizes per-collection form + previewUrl + type", () => {
		const config = defineAstroCms({
			posts: {
				type: "collection",
				previewUrl: (id) => `/posts/${id}`,
				form: (f) => [f.field("title").label("Title")],
			},
			authors: {
				type: "singleton",
				form: (f) => [f.field("name").label("Name")],
			},
		});

		expect(config.types.posts).toBe("collection");
		expect(config.types.authors).toBe("singleton");
		expect(config.getPreviewUrl("posts", "hello")).toBe("/posts/hello");
		expect(config.getPreviewUrl("authors", "x")).toBeNull();
		expect(config.forms.posts).toHaveLength(1);
		expect(config.forms.posts?.[0]).toMatchObject({
			type: "field",
			key: "title",
			chrome: { label: "Title" },
		});
		expect(config.forms.authors?.[0]).toMatchObject({
			type: "field",
			key: "name",
			chrome: { label: "Name" },
		});
	});

	test("defaults type to collection and preview to null", () => {
		const config = defineAstroCms({
			posts: { form: (f) => [f.field("title")] },
		});
		expect(config.types.posts).toBe("collection");
		expect(config.getPreviewUrl("posts", "x")).toBeNull();
	});

	test("accepts a pre-built form tree", () => {
		const config = defineAstroCms({
			posts: {
				form: [
					{
						type: "group",
						label: "Main",
						content: [{ type: "field", key: "title" }],
					},
				],
			},
		});
		expect(config.forms.posts?.[0]).toMatchObject({
			type: "group",
			label: "Main",
		});
	});
});
