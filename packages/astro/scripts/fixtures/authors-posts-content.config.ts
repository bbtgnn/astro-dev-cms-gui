/**
 * Authors/posts content.config evaluated through content-proxy shims (host/Node).
 * Mirrors ADR-0007 glob bases under src/content/{authors,posts}.
 */
import { z } from "zod";
import { glob } from "../../src/content-proxy/shims/astro-loaders";
import {
	stampImageSchema,
	stampRelationSchema,
} from "../../src/content-proxy/stamp-helpers";

function reference(collection: string) {
	return stampRelationSchema(z.string(), collection);
}

/** Astro `image()` Input is a path string; stamp marks kind for form/host. */
function image() {
	return stampImageSchema(z.string());
}

function defineCollection(config: {
	loader: unknown;
	schema: z.ZodType | ((ctx: { image: typeof image }) => z.ZodType);
}) {
	const schema =
		typeof config.schema === "function"
			? config.schema({ image })
			: config.schema;
	return { loader: config.loader, schema };
}

const authors = defineCollection({
	loader: glob({
		pattern: "**/*.json",
		base: "./src/content/authors",
	}),
	schema: z.object({
		name: z.string().min(1),
	}),
});

const posts = defineCollection({
	loader: glob({
		pattern: "**/*.json",
		base: "./src/content/posts",
	}),
	schema: ({ image: img }) =>
		z.object({
			title: z.string().min(1),
			cover: img().optional(),
			author: reference("authors"),
		}),
});

export const collections = { authors, posts };
