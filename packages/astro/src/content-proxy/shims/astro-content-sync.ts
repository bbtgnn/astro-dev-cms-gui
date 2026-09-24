/**
 * Host/Node shim of `astro:content` for `cms sync` (no Astro Vite graph).
 * Stamps reference / function-schema image like the boot proxy; Materialize
 * with string Input for image (same as FS host stub).
 */
import { z } from "zod";
import { stampImageSchema, stampRelationSchema } from "../stamp-helpers";

export { z };

export type SchemaContext = {
	image: () => z.ZodType;
};

export function reference(collection: string) {
	return stampRelationSchema(z.string(), collection);
}

export function defineCollection(config: {
	loader?: unknown;
	schema?: z.ZodType | ((ctx: SchemaContext) => z.ZodType);
	[key: string]: unknown;
}) {
	if (config && typeof config.schema === "function") {
		const userSchema = config.schema;
		return {
			...config,
			schema: (ctx: SchemaContext) => {
				const image = () => stampImageSchema(ctx.image());
				return userSchema({ ...ctx, image });
			},
		};
	}
	return config;
}

/** Unused query APIs — present so accidental imports do not crash sync. */
export async function getCollection() {
	throw new Error("getCollection is unavailable during cms sync");
}
export async function getEntry() {
	throw new Error("getEntry is unavailable during cms sync");
}
