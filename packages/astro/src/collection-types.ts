/**
 * CMS Input collection types — branded leaves + typed overlay chrome.
 *
 * Projects augment {@link CmsCollections} via generated `src/cms.types.d.ts`
 * (`cms sync` / Vite emit). Stamped image/ref become {@link CmsImage} /
 * {@link CmsReference} so `ui` chrome can discriminate kinds.
 */

import type { OpaqueBinding } from "@cms/core/semantic";

/** Editor mode for a collection (default `"collection"`). */
export type CmsCollectionType = "collection" | "singleton";

/** Persisted image path (Input). Brand enables kind-aware {@link ChromeFor}. */
export type CmsImage = string & { readonly __cmsKind: "image" };

/** Persisted entry id for a content reference (Input). */
export type CmsReference<C extends string = string> = string & {
	readonly __cmsKind: "reference";
	readonly __cmsCollection: C;
};

/**
 * Augmented per project by codegen. Empty until `cms sync` / first `cms()` boot.
 */
export interface CmsCollections {}

export type CmsCollectionName = keyof CmsCollections;

/** Field kind map (optional codegen companion for UI conditionals). */
export interface CmsFieldKinds {}

type FieldChromeBase = {
	readonly label?: string;
	readonly editor?: OpaqueBinding;
	/** Optional kind tag (codegen brands enable narrowing to image/reference). */
	readonly kind?: "image" | "reference";
};

/**
 * Nested field chrome keyed by CMS Input shape.
 * Image/ref brands narrow optional `kind` for editor UX.
 */
export type ChromeFor<T> = {
	readonly [K in keyof T]?: T[K] extends CmsImage
		? FieldChromeBase & { readonly kind?: "image" }
		: T[K] extends CmsReference<string>
			? FieldChromeBase & { readonly kind?: "reference" }
			: NonNullable<T[K]> extends readonly (infer _E)[]
				? FieldChromeBase
				: NonNullable<T[K]> extends object
					? FieldChromeBase & {
							readonly fields?: ChromeFor<NonNullable<T[K]>>;
						}
					: FieldChromeBase;
};

export type CmsCollectionOptionsFor<Data> = {
	readonly previewUrl?: (id: string) => string | null;
	readonly type?: CmsCollectionType;
	readonly ui?: ChromeFor<Data>;
};

/** Options when generated {@link CmsCollections} is available. */
export type DefineCmsOptionsFromGenerated = {
	readonly [K in CmsCollectionName]?: CmsCollections[K] extends infer Data
		? CmsCollectionOptionsFor<Data>
		: never;
};
