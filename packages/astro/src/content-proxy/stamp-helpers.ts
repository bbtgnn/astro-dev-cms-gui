/**
 * Shared content-field stamps for Astro content proxy (boot wrap).
 * Boot preserves Astro validators; stamps mark `reference` / function-schema
 * `image` kinds for host form projection (readable on host/Node only).
 */

export const CONTENT_FIELD_STAMP = Symbol.for("@cms/astro.contentFieldStamp");

export type ReferenceFieldStamp = {
	kind: "reference";
	collection: string;
};

export type ImageFieldStamp = {
	kind: "image";
};

export type ContentFieldStamp = ReferenceFieldStamp | ImageFieldStamp;

type MetaCapable = {
	meta?: (m: unknown) => unknown;
};

type StampedSchema = {
	[CONTENT_FIELD_STAMP]?: ContentFieldStamp;
};

/** Zod-meta payload (also readable via `z.globalRegistry` when present). */
export function relationFieldMeta(collection: string) {
	return { cms: { kind: "reference" as const, collection } };
}

export function imageFieldMeta() {
	return { cms: { kind: "image" as const } };
}

export function getContentFieldStamp(
	schema: unknown,
): ContentFieldStamp | undefined {
	if (!schema || typeof schema !== "object") return undefined;
	return (schema as StampedSchema)[CONTENT_FIELD_STAMP];
}

function attachStamp<T>(schema: T, stamp: ContentFieldStamp): T {
	(schema as StampedSchema)[CONTENT_FIELD_STAMP] = stamp;
	return schema;
}

/** Stamp relation meta onto an existing schema (boot wrap of Astro `reference`). */
export function stampRelationSchema<T extends MetaCapable>(
	schema: T,
	collection: string,
): T {
	const stamp: ReferenceFieldStamp = { kind: "reference", collection };
	if (schema && typeof schema.meta === "function") {
		return attachStamp(schema.meta(relationFieldMeta(collection)) as T, stamp);
	}
	return attachStamp(schema, stamp);
}

/** Stamp image meta onto an existing schema (boot wrap of function-schema `image()`). */
export function stampImageSchema<T extends MetaCapable>(schema: T): T {
	const stamp: ImageFieldStamp = { kind: "image" };
	if (schema && typeof schema.meta === "function") {
		return attachStamp(schema.meta(imageFieldMeta()) as T, stamp);
	}
	return attachStamp(schema, stamp);
}
