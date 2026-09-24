/**
 * @cms/authoring — form shell wrap around svelte-jsonschema-form.
 * Public mount face: {@link authoringPropsFromFormModels} (+ defineCms sugar).
 * editorCollections* lowering and SJSF / stock stay package-private
 * (ADR-0011 / exploration schema-first).
 */
export { default as CmsForm } from "./CmsForm.svelte";
export type {
	CmsAssetsFieldContext,
	CmsEntryContext,
} from "./ImageField.svelte";
export { wrapFieldEditorForSjsf } from "./wrap-field-editor";
