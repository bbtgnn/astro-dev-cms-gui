/**
 * Hand-authored Astro content collections (schema-first).
 * CMS stamps `glob` / `image` / `reference` via content-proxy; no generate.
 */
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { authorsSchema, postsSchema } from "./schemas";

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
export { authorsSchema, postsSchema, postsSchemaInput } from "./schemas";
