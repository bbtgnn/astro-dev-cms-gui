/**
 * Hand-authored Astro content collections (schema-first).
 * Same schemas as @cms/astro-demo-simple (+ nested seo for overlay chrome).
 * CMS stamps `glob` / `image` / `reference` via content-proxy; no generate.
 */
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
	authorsSchema,
	postsSchema,
} from "@cms/astro-demo-simple/schemas";

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
