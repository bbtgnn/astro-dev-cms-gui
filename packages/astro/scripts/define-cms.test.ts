/**
 * Host facade: `defineCms(collections, overlay)` schema-first face.
 */

import { describe, expect, test } from "bun:test";
import { projectSchemaFormModels } from "@cms/core/semantic";
import { z } from "zod";
import { defineCms } from "../src/config.ts";

describe("defineCms", () => {
	test("returns collections + overlays for form projection", () => {
		const posts = z.object({
			title: z.string().min(1),
			author: z.string(),
		});
		const config = defineCms(
			{ posts },
			{
				overlays: {
					posts: {
						title: { label: "Title" },
					},
				},
			},
		);

		expect(config.collections.posts).toBe(posts);
		const models = projectSchemaFormModels(config.collections, {
			overlays: config.overlays,
		});
		expect(models.posts?.fields.title?.label).toBe("Title");
		expect(config.getPreviewUrl("posts", "x")).toBeNull();
	});
});
