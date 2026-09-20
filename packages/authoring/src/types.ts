/**
 * Host-injected seams for the reusable authoring application.
 * Package name / graph are provisional (ADR-0009).
 */
import type { UiSchemaNode } from "@cms/core/fields";
import type { CmsFetchClient } from "@cms/core/fetch-client";
import type { z } from "zod";

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
 * Prefer lowered IR form models (JSON Schema + uiSchema); Zod+FieldUi remains
 * for legacy hosts until fully migrated.
 */
export type EditorCollectionInput =
	| z.ZodType
	| {
			readonly schema: Record<string, unknown>;
			readonly uiSchema?: UiSchemaNode;
	  };

/** Host-compiled editor schemas (IR form model or legacy Zod + FieldUi). */
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

export function isZodEditorSchema(value: unknown): value is z.ZodType {
	return (
		typeof value === "object" &&
		value !== null &&
		"_zod" in value &&
		typeof (value as { parse?: unknown }).parse === "function"
	);
}

/** Normalize collection input to CmsForm schema + optional uiSchema. */
export function resolveEditorCollection(input: EditorCollectionInput): {
	schema: z.ZodType | Record<string, unknown>;
	uiSchema?: UiSchemaNode;
} {
	if (isZodEditorSchema(input)) {
		return { schema: input };
	}
	return {
		schema: input.schema,
		...(input.uiSchema !== undefined ? { uiSchema: input.uiSchema } : {}),
	};
}
