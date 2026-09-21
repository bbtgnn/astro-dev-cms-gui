/**
 * @cms/authoring — form shell wrap around svelte-jsonschema-form.
 * IR form-model lowering + stock-by-kind registry (ADR-0019).
 */
export { default as CmsForm } from "./CmsForm.svelte";
export { editorCollectionsFromFormModels } from "./editor-collections";
export type {
	CmsAssetsFieldContext,
	CmsEntryContext,
} from "./ImageField.svelte";
export {
	type LoweredSjsfSchemas,
	type LowerFormModelOptions,
	lowerFormModelToSjsf,
} from "./lower-sjsf";
export {
	getStockEditor,
	type LiveBindingResolver,
	type ResolvedFieldEditor,
	resolveCatalogBinding,
	resolveFieldEditor,
	type StockEditorEntry,
	type StockEditorRegistry,
	stockEditorRegistry,
} from "./stock-registry";
export { wrapFieldEditorForSjsf } from "./wrap-field-editor";
