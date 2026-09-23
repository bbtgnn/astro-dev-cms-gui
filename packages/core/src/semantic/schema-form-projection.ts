/**
 * Schema-first form projection: Zod/Standard Schema Input (+ stamps) → form model.
 *
 * Dual engines (intentional):
 * - **Client (Ajv / SJSF):** portable JSON Schema on {@link CollectionFormModel.jsonSchema}
 *   after this projection + authoring lower. Lossy vs Zod; good enough for UX gates.
 * - **Authoritative (host):** the live Zod / Standard Schema `.parse` / `.safeParse` on
 *   persisted Input. Do not chase Ajv ≡ Zod.
 *
 * Image / reference kinds come from content-proxy stamps (`Symbol.for` + `.meta.cms`),
 * not from inventing FieldUi-on-Zod as the overlay API. Nested overlay chrome
 * (label, editor key) merges via {@link applySchemaFormOverlay}.
 */

import { z } from "zod";
import type {
	CollectionFormModel,
	FormConstraintSummary,
	FormFieldDescriptor,
	FormLayoutNode,
	FormModelsByCollection,
} from "./form-model";
import type { OpaqueBinding, SemanticKind } from "./types";

/** Same key as `@cms/astro/content-proxy` — readable without importing the host package. */
export const CONTENT_FIELD_STAMP = Symbol.for("@cms/astro.contentFieldStamp");

export type ContentFieldStampMeta =
	| { readonly kind: "image" }
	| { readonly kind: "reference"; readonly collection: string };

/** Nested path chrome — mergeable without re-authoring the Zod schema. */
export type SchemaFormFieldChrome = {
	readonly label?: string;
	/** Opaque catalog key / binding token for a custom editor. */
	readonly editor?: OpaqueBinding;
	/** Nested chrome scoped to this object's fields. */
	readonly fields?: SchemaFormOverlay;
};

export type SchemaFormOverlay = Readonly<Record<string, SchemaFormFieldChrome>>;

export type ProjectSchemaFormOptions = {
	readonly collectionId?: string;
	readonly overlay?: SchemaFormOverlay;
};

export type ProjectSchemaFormModelsOptions = {
	readonly overlays?: Readonly<Record<string, SchemaFormOverlay>>;
};

type CmsMeta = {
	readonly cms?: {
		readonly kind?: string;
		readonly collection?: string;
	};
};

type StampedSchema = {
	readonly [CONTENT_FIELD_STAMP]?: ContentFieldStampMeta;
	readonly meta?: (() => unknown) | unknown;
	readonly type?: string;
	readonly unwrap?: () => unknown;
	readonly def?: { readonly type?: string; readonly innerType?: unknown };
};

function readCmsMeta(schema: unknown): ContentFieldStampMeta | undefined {
	if (!schema || typeof schema !== "object") return undefined;
	const stamped = schema as StampedSchema;
	const stamp = stamped[CONTENT_FIELD_STAMP];
	if (stamp?.kind === "image") return { kind: "image" };
	if (stamp?.kind === "reference") {
		return { kind: "reference", collection: stamp.collection };
	}

	let meta: unknown = stamped.meta;
	if (typeof meta === "function") {
		try {
			meta = meta.call(schema);
		} catch {
			meta = undefined;
		}
	}
	const cms = (meta as CmsMeta | undefined)?.cms;
	if (cms?.kind === "image") return { kind: "image" };
	if (cms?.kind === "reference" && typeof cms.collection === "string") {
		return { kind: "reference", collection: cms.collection };
	}
	return undefined;
}

function unwrapZod(schema: unknown): {
	inner: unknown;
	optional: boolean;
	nullable: boolean;
	defaultValue?: unknown;
	stamp: ContentFieldStampMeta | undefined;
} {
	let optional = false;
	let nullable = false;
	let defaultValue: unknown;
	let stamp = readCmsMeta(schema);
	let current: unknown = schema;

	for (let i = 0; i < 8; i++) {
		if (!current || typeof current !== "object") break;
		const node = current as StampedSchema;
		stamp = stamp ?? readCmsMeta(current);
		const t = node.type ?? node.def?.type;
		if (t === "optional" && typeof node.unwrap === "function") {
			optional = true;
			current = node.unwrap();
			continue;
		}
		if (t === "nullable" && typeof node.unwrap === "function") {
			nullable = true;
			current = node.unwrap();
			continue;
		}
		if (t === "default" && typeof node.unwrap === "function") {
			const def = (current as { def?: { defaultValue?: unknown } }).def
				?.defaultValue;
			if (def !== undefined) defaultValue = def;
			current = node.unwrap();
			continue;
		}
		break;
	}

	stamp = stamp ?? readCmsMeta(current);
	return {
		inner: current,
		optional,
		nullable,
		...(defaultValue !== undefined ? { defaultValue } : {}),
		stamp,
	};
}

function joinPath(parent: string, id: string): string {
	return parent === "" ? id : `${parent}.${id}`;
}

type JsonSchemaNode = Record<string, unknown>;

function asObject(node: unknown): JsonSchemaNode | undefined {
	if (!node || typeof node !== "object" || Array.isArray(node))
		return undefined;
	return node as JsonSchemaNode;
}

function stripCms(node: JsonSchemaNode): JsonSchemaNode {
	const { cms: _cms, ...rest } = node;
	return rest;
}

function constraintsFromJson(
	node: JsonSchemaNode,
	kind: SemanticKind,
): readonly FormConstraintSummary[] | undefined {
	const out: FormConstraintSummary[] = [];
	if (kind === "string") {
		if (typeof node.minLength === "number") {
			out.push({ method: "min", value: node.minLength });
		}
		if (typeof node.maxLength === "number") {
			out.push({ method: "max", value: node.maxLength });
		}
	}
	if (kind === "number") {
		if (typeof node.minimum === "number") {
			out.push({ method: "min", value: node.minimum });
		}
		if (typeof node.maximum === "number") {
			out.push({ method: "max", value: node.maximum });
		}
		if (node.type === "integer") {
			out.push({ method: "int" });
		}
	}
	return out.length > 0 ? out : undefined;
}

function kindFromJson(
	node: JsonSchemaNode,
	stamp: ContentFieldStampMeta | undefined,
): SemanticKind {
	if (stamp?.kind === "image") return "image";
	if (stamp?.kind === "reference") return "reference";
	if (Array.isArray(node.enum)) return "enum";
	const raw = node.type;
	const type = Array.isArray(raw) ? raw.find((t) => t !== "null") : raw;
	switch (type) {
		case "string":
			return "string";
		case "number":
		case "integer":
			return "number";
		case "boolean":
			return "boolean";
		case "object":
			return "object";
		case "array":
			return "array";
		default:
			return "string";
	}
}

function clientLeafSchema(
	node: JsonSchemaNode,
	kind: SemanticKind,
): JsonSchemaNode {
	if (kind === "image" || kind === "reference") {
		return { type: "string" };
	}
	const cleaned = stripCms(node);
	delete cleaned.$schema;
	return cleaned;
}

type WalkState = {
	fields: Record<string, FormFieldDescriptor>;
};

function projectProperty(
	id: string,
	zodSchema: unknown,
	jsonNode: JsonSchemaNode,
	parentPath: string,
	required: boolean,
	state: WalkState,
): FormLayoutNode {
	const path = joinPath(parentPath, id);
	const { inner, optional, nullable, defaultValue, stamp } =
		unwrapZod(zodSchema);
	const kind = kindFromJson(jsonNode, stamp);
	const constraints = constraintsFromJson(jsonNode, kind);

	const base: FormFieldDescriptor = {
		path,
		id,
		semanticKind: kind,
		optional: optional || !required,
		nullable,
		...(defaultValue !== undefined ? { defaultValue } : {}),
		...(constraints !== undefined ? { constraints } : {}),
		...(stamp?.kind === "reference"
			? { referenceCollection: stamp.collection }
			: {}),
	};

	if (kind === "object" && !stamp) {
		state.fields[path] = base;
		const props = asObject(jsonNode.properties) ?? {};
		const req = new Set(
			Array.isArray(jsonNode.required) ? (jsonNode.required as string[]) : [],
		);
		const zodShape = zodObjectShape(inner);
		const content: FormLayoutNode[] = [];
		for (const key of Object.keys(props)) {
			const childJson = asObject(props[key]);
			if (!childJson) continue;
			content.push(
				projectProperty(
					key,
					zodShape?.[key],
					childJson,
					path,
					req.has(key),
					state,
				),
			);
		}
		return { kind: "object", path, content };
	}

	if (kind === "array" && !stamp) {
		state.fields[path] = base;
		const itemsJson = asObject(jsonNode.items);
		const itemZod = zodArrayElement(inner);
		let item: FormLayoutNode | undefined;
		if (
			itemsJson &&
			kindFromJson(itemsJson, readCmsMeta(itemZod)) === "object"
		) {
			const itemPath = `${path}[]`;
			const itemProps = asObject(itemsJson.properties) ?? {};
			const itemReq = new Set(
				Array.isArray(itemsJson.required)
					? (itemsJson.required as string[])
					: [],
			);
			const itemShape = zodObjectShape(itemZod);
			state.fields[itemPath] = {
				path: itemPath,
				id: "item",
				semanticKind: "object",
				optional: false,
				nullable: false,
			};
			const content: FormLayoutNode[] = [];
			for (const key of Object.keys(itemProps)) {
				const childJson = asObject(itemProps[key]);
				if (!childJson) continue;
				content.push(
					projectProperty(
						key,
						itemShape?.[key],
						childJson,
						itemPath,
						itemReq.has(key),
						state,
					),
				);
			}
			item = { kind: "object", path: itemPath, content };
		}
		return {
			kind: "array",
			path,
			...(item !== undefined ? { item } : {}),
		};
	}

	state.fields[path] = base;
	return { kind: "field", path };
}

function zodObjectShape(schema: unknown): Record<string, unknown> | undefined {
	if (!schema || typeof schema !== "object") return undefined;
	const shape = (schema as { shape?: unknown }).shape;
	if (shape && typeof shape === "object") {
		return shape as Record<string, unknown>;
	}
	return undefined;
}

function zodArrayElement(schema: unknown): unknown {
	if (!schema || typeof schema !== "object") return undefined;
	const el = (schema as { element?: unknown }).element;
	if (el !== undefined) return el;
	const def = (schema as { def?: { element?: unknown } }).def;
	return def?.element;
}

function rewriteClientJsonSchema(
	json: JsonSchemaNode,
	zodSchema: unknown,
): JsonSchemaNode {
	const { inner, stamp } = unwrapZod(zodSchema);
	const kind = kindFromJson(json, stamp);
	if (kind === "image" || kind === "reference") {
		return { type: "string" };
	}

	const cleaned = stripCms({ ...json });
	delete cleaned.$schema;

	if (kind === "object") {
		const props = asObject(cleaned.properties) ?? {};
		const shape = zodObjectShape(inner) ?? {};
		const nextProps: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(props)) {
			const childJson = asObject(child);
			if (!childJson) continue;
			nextProps[key] = rewriteClientJsonSchema(childJson, shape[key]);
		}
		return {
			...cleaned,
			type: "object",
			properties: nextProps,
		};
	}

	if (kind === "array") {
		const items = asObject(cleaned.items);
		if (items) {
			return {
				...cleaned,
				type: "array",
				items: rewriteClientJsonSchema(items, zodArrayElement(inner)),
			};
		}
	}

	return cleaned;
}

/**
 * Project one collection Zod object schema into a serializable form model.
 * Thin internal form IR — not a user-authored algebra.
 */
export function projectSchemaFormModel(
	schema: z.ZodType,
	options?: ProjectSchemaFormOptions,
): CollectionFormModel {
	const collectionId = options?.collectionId ?? "collection";
	const rawJson = z.toJSONSchema(schema, {
		unrepresentable: "any",
	}) as JsonSchemaNode;

	const jsonSchema = rewriteClientJsonSchema(rawJson, schema);
	const state: WalkState = { fields: {} };
	const props = asObject(jsonSchema.properties) ?? {};
	const required = new Set(
		Array.isArray(jsonSchema.required) ? (jsonSchema.required as string[]) : [],
	);
	const shape = zodObjectShape(unwrapZod(schema).inner) ?? {};
	const content: FormLayoutNode[] = [];
	for (const key of Object.keys(props)) {
		const childJson = asObject(props[key]);
		if (!childJson) continue;
		// Use raw property JSON before rewrite for walk? We already rewrote —
		// stamps are recovered from Zod, kinds from rewritten + stamp.
		const rawProps = asObject(rawJson.properties) ?? {};
		const rawChild = asObject(rawProps[key]) ?? childJson;
		content.push(
			projectProperty(
				key,
				shape[key],
				// Prefer raw for kind detection (cms meta), then fields use rewritten schema.
				rawChild,
				"",
				required.has(key),
				state,
			),
		);
	}

	// Fix field descriptors that used raw json for constraints but ensure
	// image/ref kinds win from stamps (already handled via stamp in kindFromJson).

	let model: CollectionFormModel = {
		collectionId,
		layout: { kind: "stack", content },
		fields: state.fields,
		jsonSchema: {
			type: "object",
			properties: asObject(jsonSchema.properties) ?? {},
			...(Array.isArray(jsonSchema.required)
				? { required: jsonSchema.required }
				: {}),
			additionalProperties: jsonSchema.additionalProperties ?? false,
		},
	};

	if (options?.overlay) {
		model = applySchemaFormOverlay(model, options.overlay);
	}
	return model;
}

/**
 * Project a map of collection schemas to form models.
 */
export function projectSchemaFormModels(
	collections: Readonly<Record<string, z.ZodType>>,
	options?: ProjectSchemaFormModelsOptions,
): FormModelsByCollection {
	const out: Record<string, CollectionFormModel> = {};
	for (const [id, schema] of Object.entries(collections)) {
		out[id] = projectSchemaFormModel(schema, {
			collectionId: id,
			...(options?.overlays?.[id] !== undefined
				? { overlay: options.overlays[id] }
				: {}),
		});
	}
	return out;
}

/**
 * Merge nested overlay chrome (label, editor key) onto a projected form model.
 * Does not change persisted JSON Schema shape. Singleton lands in tickets 05/07.
 */
export function applySchemaFormOverlay(
	model: CollectionFormModel,
	overlay: SchemaFormOverlay,
	pathPrefix = "",
): CollectionFormModel {
	const fields: Record<string, FormFieldDescriptor> = { ...model.fields };

	const applyAt = (chromeMap: SchemaFormOverlay, parentPath: string) => {
		for (const [key, chrome] of Object.entries(chromeMap)) {
			const path = joinPath(parentPath, key);
			const existing = fields[path];
			if (existing) {
				fields[path] = {
					...existing,
					...(chrome.label !== undefined ? { label: chrome.label } : {}),
					...(chrome.editor !== undefined ? { component: chrome.editor } : {}),
				};
			}
			if (chrome.fields) {
				applyAt(chrome.fields, path);
			}
		}
	};

	applyAt(overlay, pathPrefix);
	return { ...model, fields };
}
