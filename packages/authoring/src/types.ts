/**
 * Host-injected seams for the reusable authoring application.
 * Package name / graph are provisional (ADR-0009).
 */

import type { CmsFetchClient } from "@cms/core/fetch-client";
import type { UiSchemaNode } from "./form/ui-schema";

/**
 * Protocol client surface used by the authoring application.
 * Prefer injecting a fetch client (or any CmsProtocol-compatible impl).
 */
export type AuthoringClient = Pick<
	CmsFetchClient,
	| "getCapabilities"
	| "listCollections"
	| "listEntries"
	| "getEntry"
	| "upsertEntry"
	| "deleteEntry"
	| "uploadImage"
>;

/**
 * One collection's editor inputs for the form shell.
 * Lowered IR form models only: Ajv-safe JSON Schema + optional uiSchema
 * (ADR-0011 / 0019). Use {@link editorCollectionsFromTree} / lowering — do
 * not pass raw Form model jsonSchema here.
 */
export type EditorCollectionInput = {
	/** Ajv-safe JSON Schema (post-lower). */
	readonly schema: Record<string, unknown>;
	readonly uiSchema?: UiSchemaNode;
};

/** Host-compiled editor schemas (IR form model → JSON Schema + uiSchema). */
export type EditorCollections = Record<string, EditorCollectionInput>;

/**
 * Host-compiled preview URL builder (ADR-0013).
 * Returns a site path/URL from collection + entry identity, or null/undefined
 * when that collection has no preview route. Never receives form data.
 */
export type GetPreviewUrl = (
	collection: string,
	id: string,
) => string | null | undefined;

/** Normalize collection input to CmsForm schema + optional uiSchema. */
export function resolveEditorCollection(input: EditorCollectionInput): {
	schema: Record<string, unknown>;
	uiSchema?: UiSchemaNode;
} {
	return {
		schema: input.schema,
		...(input.uiSchema !== undefined ? { uiSchema: input.uiSchema } : {}),
	};
}
