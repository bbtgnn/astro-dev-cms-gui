/**
 * Authoring UI — shell, form shell, and chrome (ADR-0008 / ADR-0018).
 */

export { default as AuthoringApp } from "./AuthoringApp.svelte";
export type { AuthoringStatus } from "./autosave";
export { default as PlaceholderChrome } from "./components/PlaceholderChrome.svelte";
export { default as EntryEditor } from "./EntryEditor.svelte";
export { default as CmsForm } from "./form/CmsForm.svelte";
export type {
	CmsAssetsFieldContext,
	CmsEntryContext,
} from "./form/ImageField.svelte";
export {
	type LoweredSjsfSchemas,
	type LowerFormModelOptions,
	lowerFormModelToSjsf,
} from "./form/lower-sjsf";
export {
	getStockEditor,
	type LiveBindingResolver,
	type ResolvedFieldEditor,
	resolveFieldEditor,
	type StockEditorEntry,
	type StockEditorRegistry,
	stockEditorRegistry,
} from "./form/stock-registry";
export {
	type AuthoringSession,
	type AuthoringSessionMode,
	type AuthoringSessionOptions,
	type AuthoringSessionSnapshot,
	createAuthoringSession,
	offersAssetUpload,
	offersEntryDeletion,
} from "./session";
export type {
	AuthoringClient,
	EditorCollections,
	GetPreviewUrl,
} from "./types";
