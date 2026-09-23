/**
 * Shared Zod collection schemas (schema-first authority).
 * Imported by content.config and by @cms/astro-demo defineCms dual registration.
 *
 * - `postsSchema` — Astro `defineCollection` (live `image()` / `reference`)
 * - `postsSchemaInput` — same Input shape for `defineCms` (string stub for image)
 */
import { reference, type SchemaContext } from "astro:content";
import { z } from "astro/zod";

export const authorsSchema = z.object({
	name: z.string().min(1),
});

/** Nested chrome target for overlay demo (`seo.description`). */
export const seoSchema = z
	.object({
		description: z.string().optional(),
	})
	.optional();

function buildPostsSchema<TImage extends z.ZodType>(image: () => TImage) {
	return z.object({
		title: z.string().min(1),
		draft: z.boolean().default(false),
		body: z.string(),
		cover: image().optional(),
		author: reference("authors"),
		seo: seoSchema,
	});
}

/** Astro content collection schema (SchemaContext `image`). */
export const postsSchema = ({ image }: SchemaContext) =>
	buildPostsSchema(image);

/**
 * Persisted Input dual registration for defineCms (no Astro SchemaContext).
 * Cover is a path string; reference stamp still applied via content-proxy when
 * this module loads under Vite.
 */
export const postsSchemaInput = buildPostsSchema(() => z.string());
