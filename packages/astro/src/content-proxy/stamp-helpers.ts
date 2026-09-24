/**
 * Astro content-proxy adapter onto core content-field stamps (ADR-0024).
 * Boot preserves Astro validators; stamps mark `reference` / function-schema
 * `image` kinds for host form projection (readable on host/Node only).
 */

import {
	CONTENT_FIELD_STAMP,
	type ContentFieldStamp,
	readContentFieldStamp,
	stampContentFieldLeaf,
} from "@cms/core/semantic";

export { CONTENT_FIELD_STAMP, type ContentFieldStamp };

export type ReferenceFieldStamp = {
	readonly kind: "reference";
	readonly collection: string;
};

export type ImageFieldStamp = {
	readonly kind: "image";
};

export type FileFieldStamp = {
	readonly kind: "file";
};

type MetaCapable = {
	meta?: (m: unknown) => unknown;
};

/** Zod-meta payload (also readable via `z.globalRegistry` when present). */
export function relationFieldMeta(collection: string) {
	return { cms: { kind: "reference" as const, collection } };
}

export function imageFieldMeta() {
	return { cms: { kind: "image" as const } };
}

/** Symbol-only read (boot / tests). Prefer {@link readContentFieldStamp} for meta fallback. */
export function getContentFieldStamp(
	schema: unknown,
): ContentFieldStamp | undefined {
	return readContentFieldStamp(schema);
}

/** Stamp relation meta onto an existing schema (boot wrap of Astro `reference`). */
export function stampRelationSchema<T extends MetaCapable>(
	schema: T,
	collection: string,
): T {
	const stamp: ReferenceFieldStamp = { kind: "reference", collection };
	return stampContentFieldLeaf(schema, stamp, {
		cms: relationFieldMeta(collection).cms,
	});
}

/** Stamp image meta onto an existing schema (boot wrap of function-schema `image()`). */
export function stampImageSchema<T extends MetaCapable>(schema: T): T {
	const stamp: ImageFieldStamp = { kind: "image" };
	return stampContentFieldLeaf(schema, stamp, { cms: imageFieldMeta().cms });
}
