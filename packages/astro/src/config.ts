/**
 * Host facade for `src/cms.config.ts` (schema-first overlay).
 *
 * {@link defineCms}`(collections, config)` — schema record + optional nested
 * overlay chrome. IR unified-tree builder removed (ticket 08).
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

export type CmsOverlayConfig<
	Collections extends Record<string, ZodType> = Record<string, ZodType>,
> = {
	/** Nested path chrome per collection (label, editor key, nested fields). */
	readonly overlays?: {
		readonly [K in keyof Collections]?: SchemaFormOverlay;
	};
	/** Host-compiled entry → site preview URL; null when unsupported. */
	readonly getPreviewUrl?: (collection: string, id: string) => string | null;
};

export type DefineCmsResult<
	Collections extends Record<string, ZodType> = Record<string, ZodType>,
> = {
	readonly collections: Collections;
	readonly overlays: {
		readonly [K in keyof Collections]?: SchemaFormOverlay;
	};
	readonly getPreviewUrl: (collection: string, id: string) => string | null;
};

/**
 * Schema-first overlay entry for `src/cms.config.ts`.
 *
 * Pass the same schema record imported by `content.config` (dual registration,
 * single schema authority). Overlay is presentation-only — loaders / write
 * bases stay on stamped content.config.
 */
export function defineCms<Collections extends Record<string, ZodType>>(
	collections: Collections,
	config: CmsOverlayConfig<Collections> = {},
): DefineCmsResult<Collections> {
	return {
		collections,
		overlays: (config.overlays ??
			{}) as DefineCmsResult<Collections>["overlays"],
		getPreviewUrl: config.getPreviewUrl ?? (() => null),
	};
}
