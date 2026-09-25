/**
 * Authoring UI — shell, form shell, and chrome (ADR-0008 / ADR-0018).
 */

export { default as PlaceholderChrome } from "./components/PlaceholderChrome.svelte";
export { default as CmsForm } from "./form/CmsForm.svelte";
export type {
	CmsAssetsFieldContext,
	CmsEntryContext,
} from "./form/ImageField.svelte";
export { resolveCatalogBinding } from "./form/stock-registry";
export type {
	AuthoringAppProps,
	AuthoringPropsFromDefineCmsOptions,
	AuthoringPropsOptions,
} from "./session/authoring-props";
export {
	authoringPropsFromDefineCms,
	authoringPropsFromFormModels,
} from "./session/authoring-props";
export type { AuthoringStatus } from "./session/autosave";
export {
	type OpenAuthoringSessionOptions,
	openAuthoringSession,
} from "./session/open-authoring-session";
export type {
	AuthoringSession,
	AuthoringSessionMode,
	AuthoringSessionSnapshot,
} from "./session/session";
export { default as AuthoringApp } from "./shell/AuthoringApp.svelte";
export { default as EntryEditor } from "./shell/EntryEditor.svelte";
export type {
	AuthoringClient,
	EditorCollectionInput,
	EditorCollections,
	GetPreviewUrl,
} from "./types";
export { resolveEditorCollection } from "./types";
