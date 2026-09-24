/**
 * Hand-authored Astro content collections (schema-first).
 * CMS stamps `glob` / `image` / `reference` via content-proxy; no generate.
 */
import { defineCollection, reference, type SchemaContext } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const authorsSchema = z.object({
	name: z.string().min(1),
});

const postsSchema = ({ image }: SchemaContext) =>
	z.object({
		title: z.string().min(1),
		draft: z.boolean().default(false),
		body: z.string(),
		cover: image().optional(),
		author: reference("authors"),
	});

const authors = defineCollection({
	loader: glob({
		base: "./src/content/authors",
		pattern: "**/*.json",
	}),
	schema: authorsSchema,
});

const posts = defineCollection({
	loader: glob({
		base: "./src/content/posts",
		pattern: "**/*.json",
	}),
	schema: postsSchema,
});

export const collections = { authors, posts };
