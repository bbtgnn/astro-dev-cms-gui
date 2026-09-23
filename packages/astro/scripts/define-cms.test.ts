/**
 * Host facade: `defineCms(collections, overlay)` schema-first face.
 */

import { describe, expect, test } from "bun:test";
import { projectSchemaFormModels } from "@cms/core/semantic";
import { z } from "zod";
import { defineCms, defineCmsIr } from "../src/config.ts";

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

describe("defineCmsIr (quarantined)", () => {
	test("still builds IR unified tree for generate fixtures", () => {
		const config = defineCmsIr<"posts">((s) => ({
			collections: {
				posts: s.collection({
					loader: s.glob({
						base: "./src/content/posts",
						pattern: "**/*.json",
					}),
					schema: s.field({ id: "title", schema: s.string().min(1) }),
				}),
			},
		}));
		expect(config.collections.posts).toBeDefined();
	});
});
