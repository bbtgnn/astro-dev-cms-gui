/**
 * @cms/authoring — form shell wrap around svelte-jsonschema-form.
 * Public mount seam: {@link editorCollectionsFromTree}. SJSF / stock / lower
 * stay package-private implementation (ADR-0011 / 0019).
 */
export { default as CmsForm } from "./CmsForm.svelte";
export { editorCollectionsFromTree } from "./editor-collections";
export type {
	CmsAssetsFieldContext,
	CmsEntryContext,
} from "./ImageField.svelte";
export { wrapFieldEditorForSjsf } from "./wrap-field-editor";
