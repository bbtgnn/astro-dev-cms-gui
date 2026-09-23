/**
 * @cms/authoring — form shell wrap around svelte-jsonschema-form.
 * Public mount seams: {@link editorCollectionsFromFormModels},
 * {@link editorCollectionsFromSchemas}. SJSF / stock / lower stay
 * package-private implementation (ADR-0011 / exploration schema-first).
 */
export { default as CmsForm } from "./CmsForm.svelte";
export type {
	CmsAssetsFieldContext,
	CmsEntryContext,
} from "./ImageField.svelte";
export { wrapFieldEditorForSjsf } from "./wrap-field-editor";
