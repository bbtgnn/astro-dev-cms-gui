/**
 * Serializable sjsf uiSchema nodes + Ajv-safe JSON Schema cleanup (ADR-0019).
 * No Zod FieldUi — IR form models lower into these shapes.
 */

/** Minimal sjsf uiSchema node (serializable options + optional component override). */
export type UiSchemaNode = {
	"ui:options"?: {
		title?: string;
		[key: string]: unknown;
	};
	"ui:components"?: Record<string, unknown>;
	items?: UiSchemaNode;
	oneOf?: UiSchemaNode[];
	anyOf?: UiSchemaNode[];
	[key: string]: unknown;
};

/**
 * Make JSON Schema safe for `@sjsf/ajv8-validator` / Ajv 8.
 *
 * Strip `$schema` (Zod 4 / draft-2020-12 keys Ajv may not resolve) and
 * presentation bags (`ui`, `config`) that belong in uiSchema / host chrome.
 */
export function stripUiFromJsonSchema(
	schema: Record<string, unknown>,
): Record<string, unknown> {
	// JSON round-trip: Astro island props / proxies are not always structuredClone-safe.
	const clone = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
	const walk = (node: unknown): void => {
		if (!node || typeof node !== "object") return;
		const rec = node as Record<string, unknown>;
		delete rec.$schema;
		delete rec.ui;
		delete rec.config;
		for (const value of Object.values(rec)) {
			if (Array.isArray(value)) value.forEach(walk);
			else walk(value);
		}
	};
	walk(clone);
	return clone;
}
