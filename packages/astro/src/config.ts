/**
 * Host facade for `src/cms.config.ts` (schema-first overlay).
 *
 * {@link defineCms}`(options)` — presentation only (previewUrl, type, form).
 * Prefer `export default defineCms({ … })`.
 *
 * Does **not** accept `schema` or `location` — those stay on Astro
 * `content.config` + content-proxy stamps. Portable non-Astro hosts use
 * `defineCms` from `@cms/core/define-cms` instead.
 *
 * Validation schemas come from `content.config` (stamped host / shell form
 * models). Form-tree field refs type against Input keys via `cms sync` /
 * Vite emit (`@cms/astro/collection-types`). Stamped image/ref → CmsImage /
 * CmsReference.
 *
 * Custom field editors: import `FieldEditorProps` from `@cms/authoring/config`.
 */

import type { FormTree, ScopedFormTreeHelpers } from "@cms/core/form-tree";
import {
	createFormTreeHelpers,
	createScopedFormTreeHelpers,
} from "@cms/core/form-tree";
import type {
	CmsCollections,
	CmsCollectionType,
	DefineCmsOptionsFromGenerated,
} from "./collection-types";

export type {
	FieldFn,
	FieldRefBuilder,
	FormTree,
	FormTreeColumnsNode,
	FormTreeFieldChrome,
	FormTreeFieldNode,
	FormTreeGroupNode,
	FormTreeHelpers,
	FormTreeKindHint,
	FormTreeNode,
	FormTreeTabEntry,
	FormTreeTabsNode,
	ObjectInputOf,
	ScopedFormTreeHelpers,
} from "@cms/core/form-tree";
export type {
	CmsCollectionName,
	CmsCollectionOptionsFor,
	CmsCollections,
	CmsCollectionType,
	CmsFieldKinds,
	CmsImage,
	CmsReference,
	DefineCmsOptionsFromGenerated,
	FormBuilderFor,
} from "./collection-types";
export { createFormTreeHelpers, createScopedFormTreeHelpers };

/**
 * Per-collection presentation options (loose `form` when codegen absent).
 */
export type CmsCollectionOptions = {
	readonly previewUrl?: (id: string) => string | null;
	readonly type?: CmsCollectionType;
	readonly form?:
		| FormTree
		| ((f: ScopedFormTreeHelpers<Record<string, unknown>>) => FormTree);
};

/**
 * Overlay options: strict form builders when `CmsCollections` is augmented;
 * loose record before `cms sync`.
 */
export type DefineCmsOptions = [keyof CmsCollections] extends [never]
	? Record<string, CmsCollectionOptions>
	: DefineCmsOptionsFromGenerated;

export type DefineCmsResult = {
	readonly forms: {
		readonly [K in string]?: FormTree;
	};
	readonly getPreviewUrl: (collection: string, id: string) => string | null;
	readonly types: {
		readonly [K in string]?: CmsCollectionType;
	};
};

function resolveForm(
	form:
		| FormTree
		| ((f: ScopedFormTreeHelpers<Record<string, unknown>>) => FormTree),
): FormTree {
	if (typeof form === "function") {
		return form(createScopedFormTreeHelpers<Record<string, unknown>>());
	}
	return form;
}

/**
 * Schema-first overlay entry for `src/cms.config.ts`.
 *
 * Presentation only — schemas live in `content.config`.
 * Use {@link CmsCollectionOptions.form} (form tree); path-map `ui` is gone.
 */
export function defineCms(options: DefineCmsOptions = {}): DefineCmsResult {
	const forms: Record<string, FormTree | undefined> = {};
	const types: Record<string, CmsCollectionType | undefined> = {};
	const previewByCollection = new Map<string, (id: string) => string | null>();

	for (const name of Object.keys(options)) {
		const opt = options[name as keyof typeof options] as
			| CmsCollectionOptions
			| undefined;
		if (opt?.form !== undefined) {
			forms[name] = resolveForm(
				opt.form as
					| FormTree
					| ((f: ScopedFormTreeHelpers<Record<string, unknown>>) => FormTree),
			);
		}
		types[name] = opt?.type ?? "collection";
		if (opt?.previewUrl !== undefined) {
			previewByCollection.set(name, opt.previewUrl);
		}
	}

	return {
		forms,
		types,
		getPreviewUrl: (collection, id) =>
			previewByCollection.get(collection)?.(id) ?? null,
	};
}
