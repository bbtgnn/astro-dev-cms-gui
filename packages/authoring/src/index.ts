/**
 * Authoring UI — shell, form shell, and chrome (ADR-0008 / ADR-0018).
 */

export { default as AuthoringApp } from "./AuthoringApp.svelte";
export type { AuthoringStatus } from "./autosave";
export { default as PlaceholderChrome } from "./components/PlaceholderChrome.svelte";
export { default as EntryEditor } from "./EntryEditor.svelte";
export { default as CmsForm } from "./form/CmsForm.svelte";
export {
	editorCollectionsFromFormModels,
	editorCollectionsFromSchemas,
	editorCollectionsFromTree,
	type EditorCollectionsFromSchemasOptions,
} from "./form/editor-collections";
export { resolveCatalogBinding } from "./form/stock-registry";
export type {
	CmsAssetsFieldContext,
	CmsEntryContext,
} from "./form/ImageField.svelte";
export {
	type OpenAuthoringSessionOptions,
	openAuthoringSession,
} from "./open-authoring-session";
export type {
	AuthoringSession,
	AuthoringSessionMode,
	AuthoringSessionSnapshot,
} from "./session";
export type {
	AuthoringClient,
	EditorCollectionInput,
	EditorCollections,
	GetPreviewUrl,
} from "./types";
export { resolveEditorCollection } from "./types";
