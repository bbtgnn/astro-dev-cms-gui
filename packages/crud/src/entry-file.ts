/**
 * PROTOTYPE — YAML ↔ entry `data` (ticket 10).
 */
import { parse, stringify } from "yaml";

/** Parse an on-disk entry file body into `data`. */
export function parseEntryFile(raw: string): Record<string, unknown> {
	const data = parse(raw);
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		throw new Error("Entry file must be a YAML mapping");
	}
	return data as Record<string, unknown>;
}

/** Serialize `data` as a YAML document (prefer `.yaml` on write). */
export function serializeEntryFile(data: Record<string, unknown>): string {
	const body = stringify(data, { lineWidth: 0 }).trimEnd();
	return `${body}\n`;
}
