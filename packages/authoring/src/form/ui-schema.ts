/**
 * SJSF uiSchema nodes + Ajv-safe JSON Schema cleanup (ADR-0011 internal).
 * Callers of the form shell use already-stripped schemas from lowering —
 * do not strip again in CmsForm or draft-eligibility.
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
 * presentation bags (`ui`, `config`, `cms` stamp meta) that belong in uiSchema /
 * host chrome. Used by form-model lowering so editor collection schemas are Ajv-safe.
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
		delete rec.cms;
		for (const value of Object.values(rec)) {
			if (Array.isArray(value)) value.forEach(walk);
			else walk(value);
		}
	};
	walk(clone);
	return clone;
}
