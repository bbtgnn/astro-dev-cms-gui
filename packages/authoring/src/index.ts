/**
 * Reusable authoring application — collection list + entry editor composition.
 * Package name is provisional (ADR-0009); do not treat as final extraction contract.
 */

export { default as AuthoringApp } from "./AuthoringApp.svelte";
export {
	type AuthoringStatus,
	type AutosaveController,
	type AutosaveControllerOptions,
	type AutosaveSaveResult,
	createAutosaveController,
} from "./autosave";
export { offersAssetUpload, offersEntryDeletion } from "./capabilities";
export { default as EntryEditor } from "./EntryEditor.svelte";
export type {
	AuthoringClient,
	EditorCollections,
	GetPreviewUrl,
} from "./types";
