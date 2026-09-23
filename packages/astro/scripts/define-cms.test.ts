/**
 * Host facade: `defineCms(collections, options)` schema-first face.
 */

import { describe, expect, test } from "bun:test";
import { projectSchemaFormModels } from "@cms/core/semantic";
import { z } from "zod";
import { defineCms } from "../src/config.ts";

describe("defineCms", () => {
	test("normalizes per-collection ui + previewUrl + type", () => {
		const posts = z.object({
			title: z.string().min(1),
			author: z.string(),
		});
		const authors = z.object({
			name: z.string(),
		});
		const config = defineCms(
			{ posts, authors },
			{
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
			},
		);

		expect(config.collections.posts).toBe(posts);
		expect(config.types.posts).toBe("collection");
		expect(config.types.authors).toBe("singleton");
		expect(config.getPreviewUrl("posts", "hello")).toBe("/posts/hello");
		expect(config.getPreviewUrl("authors", "x")).toBeNull();

		const models = projectSchemaFormModels(config.collections, {
			overlays: config.overlays,
		});
		expect(models.posts?.fields.title?.label).toBe("Title");
		expect(models.authors?.fields.name?.label).toBe("Name");
	});

	test("defaults type to collection and preview to null", () => {
		const posts = z.object({ title: z.string() });
		const config = defineCms({ posts }, { posts: { ui: {} } });
		expect(config.types.posts).toBe("collection");
		expect(config.getPreviewUrl("posts", "x")).toBeNull();
	});

	test("accepts Astro collection config shape and materializes function schema", () => {
		const posts = {
			schema: ({ image }: { image: () => z.ZodType }) =>
				z.object({
					title: z.string(),
					cover: image().optional(),
				}),
		};
		const config = defineCms(
			{ posts },
			{
				posts: {
					ui: { title: { label: "T" } },
				},
			},
		);
		expect(config.overlays.posts?.title?.label).toBe("T");
		const parsed = config.collections.posts.safeParse({
			title: "Hi",
			cover: "x.jpg",
		});
		expect(parsed.success).toBe(true);
	});
});
