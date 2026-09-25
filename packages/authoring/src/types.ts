/**
 * Host-injected seams for the reusable authoring application.
 * Package name / graph are provisional (ADR-0009).
 */

import type { CmsFetchClient } from "@cms/core/fetch-client";
import type { UiSchemaNode } from "./form/ui-schema";

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
 * Lowered form models only: Ajv-safe JSON Schema + optional uiSchema
 * (ADR-0011). Assemble via {@link authoringPropsFromFormModels} (or
 * defineCms sugar) — do not pass raw CollectionFormModel jsonSchema here.
 */
export type EditorCollectionInput = {
	readonly schema: Record<string, unknown>;
	readonly uiSchema?: UiSchemaNode;
};

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

export function resolveEditorCollection(input: EditorCollectionInput): {
	schema: Record<string, unknown>;
	uiSchema?: UiSchemaNode;
} {
	return {
		schema: input.schema,
		...(input.uiSchema !== undefined ? { uiSchema: input.uiSchema } : {}),
	};
}
