/**
 * JSON ↔ entry `data` (ADR-0017).
 */

export function parseEntryFile(raw: string): Record<string, unknown> {
	const data = JSON.parse(raw) as unknown;
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		throw new Error("Entry file must be a JSON object");
	}
	return data as Record<string, unknown>;
}

export function serializeEntryFile(data: Record<string, unknown>): string {
	return `${JSON.stringify(data, null, "\t")}\n`;
}
