/**
 * Reusable authoring application — collection list + entry editor composition.
 * Package name is provisional (ADR-0009); do not treat as final extraction contract.
 */

export { default as AuthoringApp } from "./AuthoringApp.svelte";
export type { AuthoringStatus } from "./autosave";
export { default as EntryEditor } from "./EntryEditor.svelte";
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
