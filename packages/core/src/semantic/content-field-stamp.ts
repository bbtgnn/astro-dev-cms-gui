/**
 * Content-field stamps: image / file / reference marks on Zod leaves
 * (ADR-0024). Attach + read (Symbol + `.meta.cms`) + unwrap wrappers.
 *
 * Form projection, persisted-Input rewrite, and Input codegen call this;
 * Astro content-proxy is a thin adapter onto attach for native helpers.
 */

/** Portable key — was `@cms/astro.contentFieldStamp` before ADR-0024. */
export const CONTENT_FIELD_STAMP = Symbol.for("@cms/core.contentFieldStamp");

export type ContentFieldStamp =
	| { readonly kind: "image" }
	| { readonly kind: "file" }
	| { readonly kind: "reference"; readonly collection: string };

/** Alias used by portable defineCms / older call sites. */
export type ContentFieldStampMeta = ContentFieldStamp;

type CmsMeta = {
	readonly cms?: {
		readonly kind?: string;
		readonly collection?: string;
	};
};

type MetaCapable = {
	meta?: (m: unknown) => unknown;
};

type StampedSchema = {
	[CONTENT_FIELD_STAMP]?: ContentFieldStamp;
	readonly meta?: (() => unknown) | unknown;
	readonly type?: string;
	readonly unwrap?: () => unknown;
	readonly def?: {
		readonly type?: string;
		readonly innerType?: unknown;
		readonly defaultValue?: unknown;
	};
};

/** Attach a content-field stamp on the Symbol slot (mutates schema object). */
export function attachContentFieldStamp<T>(
	schema: T,
	stamp: ContentFieldStamp,
): T {
	(schema as StampedSchema)[CONTENT_FIELD_STAMP] = stamp;
	return schema;
}

/**
 * Stamp + optional Zod `.meta({ cms })` when the schema supports it.
 * Used by portable `defineCms` leaves and Astro content-proxy adapters.
 */
export function stampContentFieldLeaf<T extends MetaCapable>(
	schema: T,
	stamp: ContentFieldStamp,
	meta: { readonly cms: ContentFieldStamp },
): T {
	if (schema && typeof schema.meta === "function") {
		return attachContentFieldStamp(schema.meta(meta) as T, stamp);
	}
	return attachContentFieldStamp(schema, stamp);
}

/** Read stamp from Symbol, else `.meta.cms` (both attach paths write both). */
export function readContentFieldStamp(
	schema: unknown,
): ContentFieldStamp | undefined {
	if (!schema || typeof schema !== "object") return undefined;
	const stamped = schema as StampedSchema;
	const stamp = stamped[CONTENT_FIELD_STAMP];
	if (stamp?.kind === "image") return { kind: "image" };
	if (stamp?.kind === "file") return { kind: "file" };
	if (stamp?.kind === "reference") {
		return { kind: "reference", collection: stamp.collection };
	}

	let meta: unknown = stamped.meta;
	if (typeof meta === "function") {
		try {
			meta = meta.call(schema);
		} catch {
			meta = undefined;
		}
	}
	const cms = (meta as CmsMeta | undefined)?.cms;
	if (cms?.kind === "image") return { kind: "image" };
	if (cms?.kind === "file") return { kind: "file" };
	if (cms?.kind === "reference" && typeof cms.collection === "string") {
		return { kind: "reference", collection: cms.collection };
	}
	return undefined;
}

/**
 * Peel optional / nullable / default wrappers; collect stamp along the chain.
 * Does not treat `.default()` as optional — callers that need Input optionality
 * (codegen) should OR in `defaultValue !== undefined`.
 */
export function unwrapZod(
	schema: unknown,
): {
	inner: unknown;
	optional: boolean;
	nullable: boolean;
	defaultValue?: unknown;
	stamp: ContentFieldStamp | undefined;
} {
	let optional = false;
	let nullable = false;
	let defaultValue: unknown;
	let stamp = readContentFieldStamp(schema);
	let current: unknown = schema;

	for (let i = 0; i < 8; i++) {
		if (!current || typeof current !== "object") break;
		const node = current as StampedSchema;
		stamp = stamp ?? readContentFieldStamp(current);
		const t = node.type ?? node.def?.type;
		if (t === "optional" && typeof node.unwrap === "function") {
			optional = true;
			current = node.unwrap();
			continue;
		}
		if (t === "nullable" && typeof node.unwrap === "function") {
			nullable = true;
			current = node.unwrap();
			continue;
		}
		if (t === "default" && typeof node.unwrap === "function") {
			const def = node.def?.defaultValue;
			if (def !== undefined) defaultValue = def;
			current = node.unwrap();
			continue;
		}
		break;
	}

	stamp = stamp ?? readContentFieldStamp(current);
	return {
		inner: current,
		optional,
		nullable,
		...(defaultValue !== undefined ? { defaultValue } : {}),
		stamp,
	};
}
