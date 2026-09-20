/**
 * @cms/authoring — form shell wrap around svelte-jsonschema-form.
 * Resolves FieldUi widget defaults and meta.ui Component overrides.
 * IR form-model lowering + stock-by-kind registry (ADR-0019 slice 5).
 */
export { default as CmsForm } from "./CmsForm.svelte";
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
	resolveFieldEditor,
	type StockEditorEntry,
	type StockEditorRegistry,
	stockEditorRegistry,
} from "./stock-registry";
