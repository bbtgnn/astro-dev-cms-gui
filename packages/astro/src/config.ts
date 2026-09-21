/**
 * Host facade for `src/cms.config.ts` (ADR-0019).
 *
 * Re-exports the typed authoring builders; compile remains
 * `compileSemanticIr` from `@cms/core/semantic` (Svelte-opaque at the IR seam).
 */

import {
	type CmsBuilders,
	type CmsConfigInput,
	type ComponentsCatalog,
	createCmsBuilders,
	type EmptyComponents,
} from "@cms/authoring/config";

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
 * Typed entry for the CMS unified tree (`src/cms.config.ts`).
 * - `Collections` types `reference()` targets.
 * - `Components` is the Vite catalog type (`typeof` default export of
 *   `cms.components.ts`); bind via `.editor()` / `.wrapper()` / tab `icon`
 *   string keys.
 * Returns the host config (collections + optional preview map); call
 * `compileSemanticIr({ collections })` for IR.
 */
export function defineCms<
	Collections extends string = string,
	Components extends ComponentsCatalog = EmptyComponents,
>(
	factory: (s: CmsBuilders<Collections, Components>) => CmsConfigInput,
): CmsConfigInput {
	return factory(createCmsBuilders<Collections, Components>());
}
