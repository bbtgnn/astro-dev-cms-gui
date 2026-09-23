/**
 * Host facade: `defineCms(options)` presentation-only face.
 */

import { describe, expect, test } from "bun:test";
import { defineCms } from "../src/config.ts";

describe("defineCms", () => {
	test("normalizes per-collection ui + previewUrl + type", () => {
		const config = defineCms({
			posts: {
				type: "collection",
				previewUrl: (id) => `/posts/${id}`,
				ui: {
					title: { label: "Title" },
				},
			},
			authors: {
				type: "singleton",
				ui: {
					name: { label: "Name" },
				},
			},
		});

		expect(config.types.posts).toBe("collection");
		expect(config.types.authors).toBe("singleton");
		expect(config.getPreviewUrl("posts", "hello")).toBe("/posts/hello");
		expect(config.getPreviewUrl("authors", "x")).toBeNull();
		expect(config.overlays.posts?.title?.label).toBe("Title");
		expect(config.overlays.authors?.name?.label).toBe("Name");
	});

	test("defaults type to collection and preview to null", () => {
		const config = defineCms({ posts: { ui: {} } });
		expect(config.types.posts).toBe("collection");
		expect(config.getPreviewUrl("posts", "x")).toBeNull();
	});
});
