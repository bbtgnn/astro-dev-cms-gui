/**
 * Mini content.config evaluated through content-proxy shims (host/Node only).
 * Mirrors stamped imports: `astro/loaders` → shim; `reference` / `image` stamped
 * the same way the Vite `astro:content` boot proxy wraps them.
 */
import { z } from "zod";
import { file, glob } from "../content-proxy/shims/astro-loaders";
import {
	stampImageSchema,
	stampRelationSchema,
} from "../content-proxy/stamp-helpers";

function reference(collection: string) {
	return stampRelationSchema(z.string(), collection);
}

function image() {
	return stampImageSchema(
		z.object({
			src: z.string(),
			width: z.number(),
			height: z.number(),
			format: z.string(),
		}),
	);
}

function defineCollection(config: {
	loader: unknown;
	schema:
		| Record<string, unknown>
		| ((ctx: { image: typeof image }) => Record<string, unknown>);
}) {
	const schema =
		typeof config.schema === "function"
			? config.schema({ image })
			: config.schema;
	return { loader: config.loader, schema: z.object(schema as never) };
}

const posts = defineCollection({
	loader: glob({
		pattern: "**/*.json",
		base: "./src/content/posts",
	}),
	schema: ({ image: img }) => ({
		title: z.string(),
		cover: img(),
		author: reference("authors"),
	}),
});

const settings = defineCollection({
	loader: file("./src/content/settings.json"),
	schema: {
		siteName: z.string(),
	},
});

export const collections = { posts, settings };
