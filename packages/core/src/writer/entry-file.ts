/**
 * JSON ↔ entry `data` (ADR-0017).
 */

/** Parse an on-disk entry file body into `data`. */
export function parseEntryFile(raw: string): Record<string, unknown> {
	const data = JSON.parse(raw) as unknown;
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		throw new Error("Entry file must be a JSON object");
	}
	return data as Record<string, unknown>;
}

/** Serialize `data` as a JSON document (`.json` on write). */
export function serializeEntryFile(data: Record<string, unknown>): string {
	return `${JSON.stringify(data, null, "\t")}\n`;
}
