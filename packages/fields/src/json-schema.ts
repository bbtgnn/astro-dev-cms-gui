import { z } from "zod";
import { isFieldUi, readFieldMeta, resolveFieldUi } from "./meta";
import { getFieldUiDefault } from "./registry";
import type { FieldUi } from "./types";

/** Zod → JSON Schema using Zod 4 (input shape for edit/write-back). */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
	return z.toJSONSchema(schema, {
		io: "input",
		unrepresentable: "any",
	}) as Record<string, unknown>;
}

/** Minimal sjsf uiSchema node (serializable options + optional component override). */
export type UiSchemaNode = {
	"ui:options"?: {
		title?: string;
		[key: string]: unknown;
	};
	"ui:components"?: Record<string, unknown>;
	items?: UiSchemaNode;
	[key: string]: unknown;
};

function fieldUiFromJsonNode(
	node: Record<string, unknown>,
): FieldUi | undefined {
	const ui = node.ui;
	if (isFieldUi(ui)) return ui;
	return undefined;
}

function buildNodeFromFieldUi(
	fieldUi: FieldUi | undefined,
	component?: unknown,
): UiSchemaNode | undefined {
	if (!fieldUi && !component) return undefined;

	const registry = fieldUi ? getFieldUiDefault(fieldUi.widget) : undefined;
	const node: UiSchemaNode = {};

	const title = fieldUi?.label;
	const options = {
		...(registry?.options ?? {}),
		...(fieldUi?.options ?? {}),
	};
	if (title || Object.keys(options).length > 0) {
		node["ui:options"] = {
			...(title ? { title } : {}),
			...options,
		};
	}

	// Direct meta.ui Component wins over registry / widget defaults.
	const resolvedComponent = component ?? registry?.component;
	const sjsfWidget = registry?.sjsfWidget;
	if (resolvedComponent != null && sjsfWidget) {
		node["ui:components"] = { [sjsfWidget]: resolvedComponent };
	} else if (resolvedComponent != null) {
		// Fallback: override textWidget when no mapped foundational key.
		node["ui:components"] = { textWidget: resolvedComponent };
	}

	return Object.keys(node).length > 0 ? node : undefined;
}

function walkJsonSchema(
	node: Record<string, unknown>,
	zodNode?: z.ZodType,
): UiSchemaNode | undefined {
	const meta = zodNode ? readFieldMeta(zodNode) : undefined;
	const resolved = resolveFieldUi(meta);

	let fieldUi = resolved.fieldUi;
	if (!fieldUi) {
		fieldUi = fieldUiFromJsonNode(node);
	}

	// Component on live Zod wins even when JSON lost it.
	const component = resolved.component;

	const self = buildNodeFromFieldUi(fieldUi, component);
	const out: UiSchemaNode = { ...(self ?? {}) };

	if (
		node.type === "object" &&
		node.properties &&
		typeof node.properties === "object"
	) {
		const props = node.properties as Record<string, Record<string, unknown>>;
		const shape = getObjectShape(zodNode);
		for (const [key, propSchema] of Object.entries(props)) {
			const child = walkJsonSchema(propSchema, shape?.[key]);
			if (child) out[key] = child;
		}
	}

	if (node.type === "array" && node.items && typeof node.items === "object") {
		const itemZod = getArrayItem(zodNode);
		const items = walkJsonSchema(
			node.items as Record<string, unknown>,
			itemZod,
		);
		if (items) out.items = items;
	}

	return Object.keys(out).length > 0 ? out : undefined;
}

type ZodObjectLike = z.ZodType & {
	shape?: Record<string, z.ZodType>;
	_zod?: {
		def?: {
			type?: string;
			shape?: Record<string, z.ZodType>;
			innerType?: z.ZodType;
		};
	};
};

function unwrap(schema: z.ZodType | undefined): z.ZodType | undefined {
	let current = schema as ZodObjectLike | undefined;
	for (let i = 0; i < 12 && current; i++) {
		const type = current._zod?.def?.type;
		if (type === "object" || type === "array") return current;
		if (current.shape) return current;
		const inner = current._zod?.def?.innerType;
		if (!inner) return current;
		current = inner as ZodObjectLike;
	}
	return current;
}

function getObjectShape(
	schema: z.ZodType | undefined,
): Record<string, z.ZodType> | undefined {
	const unwrapped = unwrap(schema) as ZodObjectLike | undefined;
	if (!unwrapped) return undefined;
	if (unwrapped.shape) return unwrapped.shape;
	return unwrapped._zod?.def?.shape;
}

function getArrayItem(schema: z.ZodType | undefined): z.ZodType | undefined {
	const unwrapped = unwrap(schema) as ZodObjectLike | undefined;
	const def = unwrapped?._zod?.def as
		| { type?: string; element?: z.ZodType; items?: z.ZodType }
		| undefined;
	return def?.element ?? def?.items;
}

/**
 * Bridge FieldUi / `meta.ui` → sjsf `uiSchema`.
 * Prefer passing the live Zod schema so Component overrides survive.
 */
export function toUiSchema(
	zodOrJson: z.ZodType | Record<string, unknown>,
): UiSchemaNode {
	const isZod =
		typeof zodOrJson === "object" && zodOrJson !== null && "_zod" in zodOrJson;

	if (isZod) {
		const zod = zodOrJson as z.ZodType;
		const json = toJsonSchema(zod);
		return walkJsonSchema(json, zod) ?? {};
	}

	return walkJsonSchema(zodOrJson as Record<string, unknown>) ?? {};
}

/** Convenience: JSON Schema + uiSchema from one Zod tree. */
export function toFormSchemas(schema: z.ZodType): {
	schema: Record<string, unknown>;
	uiSchema: UiSchemaNode;
} {
	return {
		schema: toJsonSchema(schema),
		uiSchema: toUiSchema(schema),
	};
}

/**
 * Make Zod→JSON Schema safe for `@sjsf/ajv8-validator` / Ajv 8.
 *
 * Zod 4 emits `$schema: draft/2020-12`; Ajv throws
 * `no schema with key or ref "…/draft/2020-12/schema"` (sjsf surfaces
 * "Something went wrong during validation"). FieldUi / collection `config`
 * belong in uiSchema / discovery — strip them from the Ajv document.
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
