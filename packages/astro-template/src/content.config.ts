/**
 * Sample Astro content config — live discovery source for the authoring shell (P2/P5).
 * Builders / `config` / loader path hints / adapt* come from `@cms/routes`.
 */
import { reference as astroReference, defineCollection } from "astro:content";
import {
	adaptReference,
	boolean,
	config,
	i18n,
	image,
	markdown,
	object,
	text,
	withLoaderPathHint,
} from "@cms/routes";
import { glob } from "astro/loaders";
import type { z as AstroZod } from "astro/zod";
import { postsBlocksField } from "./cms/post-blocks";

/** Zod 4 builders → Astro `defineCollection` (still typed against astro/zod). */
function asAstroSchema<T>(schema: T): AstroZod.ZodTypeAny {
	return schema as unknown as AstroZod.ZodTypeAny;
}

const authors = defineCollection({
	loader: withLoaderPathHint(
		glob({
			pattern: "**/*.{yaml,yml}",
			base: "./content-sandbox/authors",
		}),
		{ base: "authors", pattern: "**/*.{yaml,yml}" },
	),
	schema: asAstroSchema(
		object(
			{
				name: text({ label: "Name" }),
			},
			{ label: "Authors" },
		).meta(config({ label: "Authors", base: "authors" })),
	),
});

const posts = defineCollection({
	loader: withLoaderPathHint(
		glob({
			pattern: "**/*.{yaml,yml}",
			base: "./content-sandbox/posts",
		}),
		{ base: "posts", pattern: "**/*.{yaml,yml}" },
	),
	schema: asAstroSchema(
		object(
			{
				title: text({ label: "Title" }),
				draft: boolean({ label: "Draft", default: false }),
				body: markdown({ label: "Body" }),
				summary: i18n(text({ label: "Summary" }), {
					label: "Summary",
					locales: ["en", "it"],
					defaultLocale: "en",
					fallbacks: { it: "en" },
				}),
				blocks: postsBlocksField,
				cover: image({ label: "Cover" }).optional(),
				author: adaptReference(astroReference("authors"), {
					label: "Author",
					collection: "authors",
				}),
			},
			{ label: "Posts" },
		).meta(config({ label: "Posts", base: "posts" })),
	),
});

export const collections = { authors, posts };
