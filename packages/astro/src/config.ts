/**
 * Host facade for `src/cms.config.ts` (ADR-0019).
 *
 * Re-exports the typed authoring builders; compile remains
 * `compileSemanticIr` from `@cms/core/semantic` (Svelte-opaque at the IR seam).
 */

import {
	type CmsBuilders,
	type CmsConfigInput,
	createCmsBuilders,
} from "@cms/authoring/config";

export type {
	AggregateWrapperProps,
	CmsBuilders,
	CmsConfigInput,
	FieldControl,
	FieldEditorProps,
	FieldError,
	FieldIcon,
	FieldKind,
	ShapeOfContent,
	ShellOwnedKey,
} from "@cms/authoring/config";
export { createCmsBuilders, SHELL_OWNED_KEYS } from "@cms/authoring/config";

/**
 * Typed entry for the CMS unified tree. Collection name generics type
 * `reference()` targets. Returns the host config (collections + optional
 * preview map); call `compileSemanticIr({ collections })` for IR.
 */
export function defineCms<Collections extends string = string>(
	factory: (s: CmsBuilders<Collections>) => CmsConfigInput,
): CmsConfigInput {
	return factory(createCmsBuilders<Collections>());
}
