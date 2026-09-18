/**
 * Sample Astro content config — live discovery source for the authoring shell.
 * Builders / `config` / loader path hints from `@cms/core`; `adapt*` from `@cms/astro`.
 *
 * Server registry edge only — browser editor schemas live in `cms.config.ts`
 * and reach the client via `virtual:@cms/config` (ADR-0004 / 0016).
 */

import { reference as astroReference, defineCollection } from "astro:content";
import { adaptReference } from "@cms/astro";
import {
	boolean,
	config,
	i18n,
	image,
	markdown,
	object,
	text,
	withLoaderPathHint,
} from "@cms/core";
import { glob } from "astro/loaders";
import type { z as AstroZod } from "astro/zod";
import type { AuthorsPersistedInput } from "./cms/authors-persisted";
import { postsBlocksField } from "./cms/post-blocks";

/** Zod 4 builders → Astro `defineCollection` (still typed against astro/zod). */
function asAstroSchema<T>(schema: T): AstroZod.ZodTypeAny {
	return schema as unknown as AstroZod.ZodTypeAny;
}

/** Compile-time equality without a broad cast (sample authors collection). */
type AssertEqual<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

const authorsShape = object(
	{
		name: text({ label: "Name" }),
	},
	{ label: "Authors" },
).meta(config({ label: "Authors", base: "authors" }));

type AuthorsServerInput = import("zod").input<typeof authorsShape>;
const _authorsServerInputParity: AssertEqual<
	AuthorsServerInput,
	AuthorsPersistedInput
> = true;
void _authorsServerInputParity;

const authors = defineCollection({
	loader: withLoaderPathHint(
		glob({
			pattern: "**/*.json",
			base: "./src/content/authors",
		}),
		{ base: "authors", pattern: "**/*.json" },
	),
	schema: asAstroSchema(authorsShape),
});

const posts = defineCollection({
	loader: withLoaderPathHint(
		glob({
			pattern: "**/*.json",
			base: "./src/content/posts",
		}),
		{ base: "posts", pattern: "**/*.json" },
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
