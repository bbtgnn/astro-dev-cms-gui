/**
 * Reusable authoring application — collection list + entry editor composition.
 * Package name is provisional (ADR-0009); do not treat as final extraction contract.
 */

export { default as AuthoringApp } from "./AuthoringApp.svelte";
export { offersAssetUpload, offersEntryDeletion } from "./capabilities";
export { default as EntryEditor } from "./EntryEditor.svelte";
export type { AuthoringClient, EditorCollections } from "./types";
