/**
 * Host-injected seams for the reusable authoring application.
 * Package name / graph are provisional (ADR-0009).
 */
import type { CmsFetchClient } from "@cms/crud/fetch-client";
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

/** Host-compiled editor schemas (Zod + FieldUi + direct components). */
export type EditorCollections = Record<string, z.ZodType>;
