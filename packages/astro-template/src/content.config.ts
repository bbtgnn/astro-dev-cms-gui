/**
 * Sample Astro content config — live discovery source for the authoring shell (P2).
 * Builders / `config` / loader path hints come from `@cms/routes` (consumer surface).
 */
import { defineCollection } from "astro:content";
import {
	boolean,
	config,
	markdown,
	object,
	text,
	withLoaderPathHint,
} from "@cms/routes";
import { glob } from "astro/loaders";

const posts = defineCollection({
	loader: withLoaderPathHint(
		glob({
			pattern: "**/*.{yaml,yml}",
			base: "./content-sandbox/posts",
		}),
		{ base: "posts", pattern: "**/*.{yaml,yml}" },
	),
	schema: object(
		{
			title: text({ label: "Title" }),
			draft: boolean({ label: "Draft", default: false }),
			body: markdown({ label: "Body" }),
		},
		{ label: "Posts" },
	).meta(config({ label: "Posts", base: "posts" })),
});

export const collections = { posts };
