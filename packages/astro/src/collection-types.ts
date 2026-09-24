/**
 * CMS Input collection types — branded leaves + typed form-tree builders.
 *
 * Projects augment {@link CmsCollections} via generated `src/cms.types.d.ts`
 * (`cms sync` / Vite emit). Stamped image/ref become {@link CmsImage} /
 * {@link CmsReference} so form-tree field refs type against Input keys.
 */

import type { FormTree, ScopedFormTreeHelpers } from "@cms/core/form-tree";

/** Editor mode for a collection (default `"collection"`). */
export type CmsCollectionType = "collection" | "singleton";

/** Persisted image path (Input). Brand enables kind-aware chrome helpers. */
export type CmsImage = string & { readonly __cmsKind: "image" };

/** Persisted entry id for a content reference (Input). */
export type CmsReference<C extends string = string> = string & {
	readonly __cmsKind: "reference";
	readonly __cmsCollection: C;
};

/**
 * Augmented per project by codegen. Empty until `cms sync` / first `cms()` boot.
 * Must stay an interface for module augmentation (not a type alias).
 */
// biome-ignore lint/suspicious/noEmptyInterface: augmentation target for cms.types.d.ts
export interface CmsCollections {}

export type CmsCollectionName = keyof CmsCollections;

/** Field kind map (optional codegen companion for UI conditionals). */
// biome-ignore lint/suspicious/noEmptyInterface: augmentation target for cms.types.d.ts
export interface CmsFieldKinds {}

/** Collection-scoped form builder: helpers typed to Input keys of `Data`. */
export type FormBuilderFor<Data> = (f: ScopedFormTreeHelpers<Data>) => FormTree;

export type CmsCollectionOptionsFor<Data> = {
	readonly previewUrl?: (id: string) => string | null;
	readonly type?: CmsCollectionType;
	/**
	 * Presentation form tree (layout + field refs), or a callback that builds
	 * one with helpers scoped to this collection’s Input keys.
	 */
	readonly form?: FormTree | FormBuilderFor<Data>;
};

/** Options when generated {@link CmsCollections} is available. */
export type DefineCmsOptionsFromGenerated = {
	readonly [K in CmsCollectionName]?: CmsCollections[K] extends infer Data
		? CmsCollectionOptionsFor<Data>
		: never;
};
