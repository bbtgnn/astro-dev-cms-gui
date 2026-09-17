/**
 * Capability-driven authoring controls (ADR-0005 / ADR-0008).
 * UI must not offer optional ops the active implementation lacks.
 */
import type { CmsCapabilities } from "@cms/crud/fetch-client";

/** Whether the authoring application should offer content-entry deletion. */
export function offersEntryDeletion(
	capabilities: CmsCapabilities | null | undefined,
): boolean {
	return capabilities?.deleteEntry === true;
}
