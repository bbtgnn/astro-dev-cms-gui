/**
 * Host facade for `src/cms.config.ts` (schema-first overlay).
 *
 * {@link defineCms}`(collections, options)` — optional schema record + per-collection
 * presentation options. IR unified-tree builder removed (ticket 08).
 */

import type { SchemaFormOverlay } from "@cms/core/semantic";
import type { ZodType } from "zod";

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

/** Editor mode for a collection (default `"collection"`). */
export type CmsCollectionType = "collection" | "singleton";

/**
 * Per-collection presentation options.
 *
 * Reserved keys stay separate from nested field chrome under {@link ui}.
 */
export type CmsCollectionOptions = {
	/** Entry id → site preview URL; omit or return null when unsupported. */
	readonly previewUrl?: (id: string) => string | null;
	/** Editor mode; default `"collection"`. */
	readonly type?: CmsCollectionType;
	/**
	 * Nested field chrome (labels, catalog editor keys, nested object chrome).
	 * Named `ui` — presentation overlay, not schema / validation.
	 */
	readonly ui?: SchemaFormOverlay;
};

/** Options bag keyed by collection name (same keys as the schema record). */
export type DefineCmsOptions<
	Collections extends Record<string, ZodType> = Record<string, ZodType>,
> = {
	readonly [K in keyof Collections]?: CmsCollectionOptions;
};

export type DefineCmsResult<
	Collections extends Record<string, ZodType> = Record<string, ZodType>,
> = {
	readonly collections: Collections;
	/** Normalized field chrome per collection (for form projection). */
	readonly overlays: {
		readonly [K in keyof Collections]?: SchemaFormOverlay;
	};
	/** Adapted host face: `(collection, id) => url`. */
	readonly getPreviewUrl: (collection: string, id: string) => string | null;
	/** Per-collection editor mode (defaults applied). */
	readonly types: {
		readonly [K in keyof Collections]?: CmsCollectionType;
	};
};

/**
 * Schema-first overlay entry for `src/cms.config.ts`.
 *
 * Pass the same schema record imported by `content.config` when dual
 * registration is desired. Overlay options are presentation-only — loaders /
 * write bases stay on stamped content.config.
 *
 * Prefer `export default defineCms(...)` — the Vite soft-bind synthesizes named
 * faces for the shell.
 */
export function defineCms<Collections extends Record<string, ZodType>>(
	collections: Collections,
	options: DefineCmsOptions<Collections> = {},
): DefineCmsResult<Collections> {
	const overlays = {} as DefineCmsResult<Collections>["overlays"];
	const types = {} as DefineCmsResult<Collections>["types"];
	const previewByCollection = new Map<
		string,
		(id: string) => string | null
	>();

	for (const name of Object.keys(collections) as (keyof Collections)[]) {
		const opt = options[name];
		if (opt?.ui !== undefined) {
			overlays[name] = opt.ui;
		}
		types[name] = opt?.type ?? "collection";
		if (opt?.previewUrl !== undefined) {
			previewByCollection.set(String(name), opt.previewUrl);
		}
	}

	return {
		collections,
		overlays,
		types,
		getPreviewUrl: (collection, id) =>
			previewByCollection.get(collection)?.(id) ?? null,
	};
}
