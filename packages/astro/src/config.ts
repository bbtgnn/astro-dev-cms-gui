/**
 * Host facade for `src/cms.config.ts` (schema-first overlay).
 *
 * {@link defineCms}`(options)` — presentation only (previewUrl, type, ui).
 * Prefer `export default defineCms({ … })`.
 *
 * Validation schemas come from `content.config` (stamped host / shell form
 * models). `ui` path safety: generate Input types via `cms sync` / Vite emit
 * (`@cms/astro/collection-types`). Stamped image/ref → CmsImage / CmsReference.
 */

import type { SchemaFormOverlay } from "@cms/core/semantic";
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

/**
 * Overlay options: strict {@link ChromeFor} when `CmsCollections` is augmented;
 * loose record before `cms sync`.
 */
export type DefineCmsOptions = [keyof CmsCollections] extends [never]
	? Record<string, CmsCollectionOptions>
	: DefineCmsOptionsFromGenerated;

export type DefineCmsResult = {
	readonly overlays: {
		readonly [K in string]?: SchemaFormOverlay;
	};
	readonly getPreviewUrl: (collection: string, id: string) => string | null;
	readonly types: {
		readonly [K in string]?: CmsCollectionType;
	};
};

/**
 * Schema-first overlay entry for `src/cms.config.ts`.
 *
 * Presentation only — schemas live in `content.config`.
 */
export function defineCms(options: DefineCmsOptions = {}): DefineCmsResult {
	const overlays: Record<string, SchemaFormOverlay | undefined> = {};
	const types: Record<string, CmsCollectionType | undefined> = {};
	const previewByCollection = new Map<
		string,
		(id: string) => string | null
	>();

	for (const name of Object.keys(options)) {
		const opt = options[name as keyof typeof options] as
			| CmsCollectionOptions
			| undefined;
		if (opt?.ui !== undefined) {
			overlays[name] = opt.ui as SchemaFormOverlay;
		}
		types[name] = opt?.type ?? "collection";
		if (opt?.previewUrl !== undefined) {
			previewByCollection.set(name, opt.previewUrl);
		}
	}

	return {
		overlays,
		types,
		getPreviewUrl: (collection, id) =>
			previewByCollection.get(collection)?.(id) ?? null,
	};
}
