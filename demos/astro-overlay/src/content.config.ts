/**
 * Hand-authored Astro content collections (schema-first).
 * CMS stamps `glob` / `image` / `reference` via content-proxy; no generate.
 * Nested optional `seo` supports overlay field chrome.
 */
import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const authors = defineCollection({
	loader: glob({
		base: "./src/content/authors",
		pattern: "**/*.json",
	}),
	schema: z.object({
		name: z.string().min(1),
	}),
});

const posts = defineCollection({
	loader: glob({
		base: "./src/content/posts",
		pattern: "**/*.json",
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string().min(1),
			draft: z.boolean().default(false),
			body: z.string(),
			cover: image().optional(),
			author: reference("authors"),
			seo: z
				.object({
					description: z.string().optional(),
				})
				.optional(),
		}),
});

export const collections = { authors, posts };
