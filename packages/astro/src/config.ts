/**
 * Host facade for `src/cms.config.ts` (schema-first overlay).
 *
 * {@link defineCms}`(collections, options)` — Astro `collections` export (or plain
 * Zod map) + per-collection presentation options. Prefer
 * `export default defineCms(collections, { … })`.
 *
 * `ui` path safety: generate Input types via `cms sync` / Vite emit
 * (`@cms/astro/collection-types`). Stamped image/ref → CmsImage / CmsReference.
 */

import type { SchemaFormOverlay } from "@cms/core/semantic";
import type { ZodType } from "zod";
import type { StampedCollectionConfig } from "./build-fs-host-from-stamped";
import { materializeSchema } from "./build-fs-host-from-stamped";
import type {
	ChromeFor,
	CmsCollectionOptionsFor,
	CmsCollectionType,
	CmsCollections,
	DefineCmsOptionsFromGenerated,
} from "./collection-types";

export type {
	ChromeFor,
	CmsCollectionOptionsFor,
	CmsCollectionType,
	CmsCollections,
	CmsCollectionName,
	CmsFieldKinds,
	CmsImage,
	CmsReference,
	DefineCmsOptionsFromGenerated,
} from "./collection-types";

export type {
	AggregateWrapperProps,
	CmsBuilders,
	CmsConfigInput,
	CompatibleIconKey,
	CompatibleKey,
	CompatibleWrapperKey,
	ComponentsCatalog,
	EmptyComponents,
	FieldControl,
	FieldEditorProps,
	FieldError,
	FieldIcon,
	FieldKind,
	ShapeOfContent,
	ShellOwnedKey,
} from "@cms/authoring/config";
export {
	createCmsBuilders,
	createFieldControl,
	SHELL_OWNED_KEYS,
} from "@cms/authoring/config";

/**
 * Per-collection presentation options (loose `ui` when codegen absent).
 */
export type CmsCollectionOptions = {
	readonly previewUrl?: (id: string) => string | null;
	readonly type?: CmsCollectionType;
	readonly ui?: SchemaFormOverlay | ChromeFor<Record<string, unknown>>;
};

export type AstroCollectionsInput = Record<string, StampedCollectionConfig>;

export type DefineCmsOptions<Cols extends Record<string, unknown>> = {
	readonly [K in keyof Cols]?: K extends keyof CmsCollections
		? CmsCollectionOptionsFor<CmsCollections[K]>
		: CmsCollectionOptions;
};

export type DefineCmsResult<
	Schemas extends Record<string, ZodType> = Record<string, ZodType>,
> = {
	readonly collections: Schemas;
	readonly overlays: {
		readonly [K in keyof Schemas]?: SchemaFormOverlay;
	};
	readonly getPreviewUrl: (collection: string, id: string) => string | null;
	readonly types: {
		readonly [K in keyof Schemas]?: CmsCollectionType;
	};
};

function isZodType(value: unknown): value is ZodType {
	return (
		!!value &&
		typeof value === "object" &&
		"parse" in value &&
		typeof (value as { parse?: unknown }).parse === "function"
	);
}

function isAstroCollectionConfig(value: unknown): value is StampedCollectionConfig {
	if (!value || typeof value !== "object") return false;
	return "schema" in value || "loader" in value;
}

/**
 * Normalize first-arg map: Astro `defineCollection` results or plain Zod schemas.
 */
export function materializeDefineCmsCollections<
	Cols extends Record<string, StampedCollectionConfig | ZodType>,
>(collections: Cols): { [K in keyof Cols]: ZodType } {
	const out = {} as { [K in keyof Cols]: ZodType };
	for (const name of Object.keys(collections) as (keyof Cols)[]) {
		const value = collections[name];
		if (isAstroCollectionConfig(value)) {
			out[name] = materializeSchema(value.schema, String(name));
			continue;
		}
		if (isZodType(value)) {
			out[name] = value;
			continue;
		}
		throw new Error(
			`defineCms: collection "${String(name)}" must be a Zod schema or Astro collection config`,
		);
	}
	return out;
}

/**
 * Schema-first overlay entry for `src/cms.config.ts`.
 *
 * Pass Astro `collections` from `content.config` (preferred) or a plain Zod map.
 * Overlay options are presentation-only.
 */
export function defineCms<Cols extends Record<string, unknown>>(
	collections: Cols,
	options: DefineCmsOptions<Cols> & Partial<DefineCmsOptionsFromGenerated> = {},
): DefineCmsResult<{ [K in keyof Cols]: ZodType }> {
	const schemas = materializeDefineCmsCollections(
		collections as Record<string, StampedCollectionConfig | ZodType>,
	) as { [K in keyof Cols]: ZodType };
	const overlays: Record<string, SchemaFormOverlay | undefined> = {};
	const types: Record<string, CmsCollectionType | undefined> = {};
	const previewByCollection = new Map<
		string,
		(id: string) => string | null
	>();

	for (const name of Object.keys(schemas) as (keyof Cols)[]) {
		const opt = options[name as keyof typeof options] as
			| CmsCollectionOptions
			| undefined;
		if (opt?.ui !== undefined) {
			overlays[String(name)] = opt.ui as SchemaFormOverlay;
		}
		types[String(name)] = opt?.type ?? "collection";
		if (opt?.previewUrl !== undefined) {
			previewByCollection.set(String(name), opt.previewUrl);
		}
	}

	return {
		collections: schemas,
		overlays: overlays as DefineCmsResult<{
			[K in keyof Cols]: ZodType;
		}>["overlays"],
		types: types as DefineCmsResult<{
			[K in keyof Cols]: ZodType;
		}>["types"],
		getPreviewUrl: (collection, id) =>
			previewByCollection.get(collection)?.(id) ?? null,
	};
}
