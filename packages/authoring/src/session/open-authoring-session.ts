/**
 * Fail-closed Authoring session open — public product face (ADR-0014).
 * Missing editor schema → no session; present schema → draft eligibility
 * wired into the package-private session factory.
 */
import type { CmsCapabilities } from "@cms/core/fetch-client";
import type {
	AuthoringClient,
	EditorCollectionInput,
	GetPreviewUrl,
} from "../types";
import type { AutosaveTimers } from "./autosave";
import { createDraftEligibility } from "./draft-eligibility";
import {
	type AuthoringSession,
	type AuthoringSessionMode,
	createAuthoringSession,
} from "./session";

export type OpenAuthoringSessionOptions = {
	schema: EditorCollectionInput | null;
	client: AuthoringClient;
	collection: string;
	mode: AuthoringSessionMode;
	capabilities?: CmsCapabilities | null;
	getPreviewUrl?: GetPreviewUrl;
	debounceMs?: number;
	timers?: AutosaveTimers;
};

export function openAuthoringSession(
	options: OpenAuthoringSessionOptions,
): AuthoringSession | null {
	const { schema, ...sessionOptions } = options;
	if (schema == null) return null;

	const isClientValid = createDraftEligibility(schema.schema);
	return createAuthoringSession({
		...sessionOptions,
		isClientValid,
	});
}
