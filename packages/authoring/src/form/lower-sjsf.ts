/**
 * Bounded IR form-model → SJSF uiSchema lowering (ADR-0011 internal path).
 * Additive: legacy FieldUi / Zod `.meta()` path remains until slice 6.
 */

import type { UiSchemaNode } from "@cms/core/fields";
import { stripUiFromJsonSchema } from "@cms/core/fields";
import type {
	CollectionFormModel,
	FormFieldDescriptor,
	FormLayoutNode,
} from "@cms/core/semantic";
import {
	type LiveBindingResolver,
	resolveFieldEditor,
	type StockEditorRegistry,
	stockEditorRegistry,
} from "./stock-registry";

export type LowerFormModelOptions = {
	readonly resolveBinding?: LiveBindingResolver;
	readonly registry?: StockEditorRegistry;
};

function uiNodeForField(
	field: FormFieldDescriptor,
	options?: LowerFormModelOptions,
): UiSchemaNode {
	const resolved = resolveFieldEditor(field, options);
	const node: UiSchemaNode = {};

	if (field.label) {
		node["ui:options"] = { title: field.label };
	}

	if (resolved.source === "override") {
		node["ui:components"] = { textWidget: resolved.component };
		return node;
	}

	const { entry } = resolved;
	if (entry.componentKey && entry.sjsfWidget) {
		node["ui:components"] = { [entry.sjsfWidget]: entry.componentKey };
	} else if (entry.componentKey) {
		node["ui:components"] = { textWidget: entry.componentKey };
	}

	return node;
}

/**
 * Walk layout for durable field paths and nest uiSchema under object keys.
 * Presentation-only nodes (header/separator/tabs chrome) do not add properties.
 */
function lowerLayout(
	layout: FormLayoutNode,
	fields: Readonly<Record<string, FormFieldDescriptor>>,
	options: LowerFormModelOptions | undefined,
	out: UiSchemaNode,
): void {
	switch (layout.kind) {
		case "field": {
			const field = fields[layout.path];
			if (!field) return;
			const leaf = uiNodeForField(field, options);
			const key = field.id;
			if (Object.keys(leaf).length > 0) out[key] = leaf;
			return;
		}
		case "object": {
			const field = fields[layout.path];
			const child: UiSchemaNode = {};
			for (const node of layout.content) {
				lowerLayout(node, fields, options, child);
			}
			if (field) {
				const self = uiNodeForField(field, options);
				out[field.id] = { ...self, ...child };
			} else {
				Object.assign(out, child);
			}
			return;
		}
		case "array": {
			const field = fields[layout.path];
			if (!field) return;
			const self = uiNodeForField(field, options);
			if (layout.item && layout.item.kind === "object") {
				const items: UiSchemaNode = {};
				for (const node of layout.item.content) {
					lowerLayout(node, fields, options, items);
				}
				self.items = items;
			}
			out[field.id] = self;
			return;
		}
		case "discriminatedUnion": {
			const field = fields[layout.path];
			if (!field) return;
			out[field.id] = uiNodeForField(field, options);
			return;
		}
		case "tabs":
		case "stack":
		case "columns":
		case "group": {
			for (const child of layout.content) {
				lowerLayout(child, fields, options, out);
			}
			return;
		}
		case "tab":
		case "column": {
			for (const child of layout.content) {
				lowerLayout(child, fields, options, out);
			}
			return;
		}
		case "header":
		case "separator":
			return;
		default: {
			const _exhaustive: never = layout;
			void _exhaustive;
		}
	}
}

export type LoweredSjsfSchemas = {
	readonly schema: Record<string, unknown>;
	readonly uiSchema: UiSchemaNode;
};

/**
 * Lower a collection form model to Ajv-safe JSON Schema + sjsf uiSchema.
 * Stock editors apply by semantic kind; field `component` overrides win.
 */
export function lowerFormModelToSjsf(
	model: CollectionFormModel,
	options?: LowerFormModelOptions,
): LoweredSjsfSchemas {
	const opts = {
		registry: options?.registry ?? stockEditorRegistry,
		...(options?.resolveBinding !== undefined
			? { resolveBinding: options.resolveBinding }
			: {}),
	};
	const uiSchema: UiSchemaNode = {};
	lowerLayout(model.layout, model.fields, opts, uiSchema);
	return {
		schema: stripUiFromJsonSchema(model.jsonSchema),
		uiSchema,
	};
}
