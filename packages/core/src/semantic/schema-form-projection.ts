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
 * not FieldUi-on-Zod. Optional **form tree** lowers layout + field-ref chrome
 * (label, editor catalog key, kind hints).
 */

import { z } from "zod";
import type { FormTree, FormTreeFieldChrome, FormTreeNode } from "../form-tree";
import type {
	CollectionFormModel,
	FormConstraintSummary,
	FormFieldDescriptor,
	FormLayoutNode,
	FormModelsByCollection,
} from "./form-model";
import type { SemanticKind } from "./types";

/** Same key as `@cms/astro/content-proxy` — readable without importing the host package. */
export const CONTENT_FIELD_STAMP = Symbol.for("@cms/astro.contentFieldStamp");

export type ContentFieldStampMeta =
	| { readonly kind: "image" }
	| { readonly kind: "file" }
	| { readonly kind: "reference"; readonly collection: string };

export type ProjectSchemaFormOptions = {
	readonly collectionId?: string;
	/** Optional form tree — layout + field-ref chrome. */
	readonly form?: FormTree;
};

export type ProjectSchemaFormModelsOptions = {
	readonly forms?: Readonly<Record<string, FormTree>>;
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
	if (stamp?.kind === "file") return { kind: "file" };
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
	if (cms?.kind === "file") return { kind: "file" };
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

type WalkState = {
	fields: Record<string, FormFieldDescriptor>;
	/** Default schema-derived layout node per durable path (for form-tree placement). */
	defaultLayoutByPath: Record<string, FormLayoutNode>;
	/** Ordered direct child keys for object paths (`""` = collection root). */
	childKeysByPath: Record<string, string[]>;
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
		const childKeys = Object.keys(props);
		state.childKeysByPath[path] = childKeys;
		const content: FormLayoutNode[] = [];
		for (const key of childKeys) {
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
		const layout: FormLayoutNode = { kind: "object", path, content };
		state.defaultLayoutByPath[path] = layout;
		return layout;
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
			const itemChildKeys = Object.keys(itemProps);
			state.childKeysByPath[itemPath] = itemChildKeys;
			const content: FormLayoutNode[] = [];
			for (const key of itemChildKeys) {
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
			state.defaultLayoutByPath[itemPath] = item;
		}
		const layout: FormLayoutNode = {
			kind: "array",
			path,
			...(item !== undefined ? { item } : {}),
		};
		state.defaultLayoutByPath[path] = layout;
		return layout;
	}

	state.fields[path] = base;
	const layout: FormLayoutNode = { kind: "field", path };
	state.defaultLayoutByPath[path] = layout;
	return layout;
}

function applyFieldRefChrome(
	fields: Record<string, FormFieldDescriptor>,
	path: string,
	chrome: FormTreeFieldChrome | undefined,
): void {
	if (!chrome) return;
	const existing = fields[path];
	if (!existing) return;
	fields[path] = {
		...existing,
		...(chrome.label !== undefined ? { label: chrome.label } : {}),
		...(chrome.editor !== undefined ? { component: chrome.editor } : {}),
		...(chrome.kind !== undefined ? { semanticKind: chrome.kind } : {}),
	};
}

function cloneLayout(node: FormLayoutNode): FormLayoutNode {
	return structuredClone(node);
}

/**
 * Lower a form-tree scope (root stack or object `.fields` / `.form`) into layout
 * nodes. Unplaced schema keys at this scope append after explicit placement
 * (ADR-0011 vertical fallback). Layout containers share the same key space.
 */
function lowerFormTreeScope(
	nodes: readonly FormTreeNode[],
	pathPrefix: string,
	state: WalkState,
): FormLayoutNode[] {
	const placedKeys = new Set<string>();
	const content: FormLayoutNode[] = [];

	for (const node of nodes) {
		content.push(lowerFormTreeNode(node, pathPrefix, state, placedKeys));
	}

	const scopeKeys = state.childKeysByPath[pathPrefix] ?? [];
	for (const key of scopeKeys) {
		if (placedKeys.has(key)) continue;
		const path = joinPath(pathPrefix, key);
		const fallback = state.defaultLayoutByPath[path];
		if (fallback) content.push(cloneLayout(fallback));
	}

	return content;
}

function lowerFormTreeNode(
	node: FormTreeNode,
	pathPrefix: string,
	state: WalkState,
	placedKeys: Set<string>,
): FormLayoutNode {
	switch (node.type) {
		case "field": {
			const path = joinPath(pathPrefix, node.key);
			if (!(path in state.fields)) {
				throw new Error(
					`Unknown field key in form tree: "${path}" (not in collection schema)`,
				);
			}
			placedKeys.add(node.key);
			applyFieldRefChrome(state.fields, path, node.chrome);

			if (node.content !== undefined) {
				return {
					kind: "object",
					path,
					content: lowerFormTreeScope(node.content, path, state),
				};
			}

			const defaults = state.defaultLayoutByPath[path];
			if (!defaults) {
				throw new Error(`Missing default layout for form tree field "${path}"`);
			}
			return cloneLayout(defaults);
		}
		case "tabs":
			return {
				kind: "tabs",
				content: node.content.map((tab) => ({
					kind: "tab" as const,
					id: tab.id,
					label: tab.label ?? tab.id,
					content: tab.content.map((child) =>
						lowerFormTreeNode(child, pathPrefix, state, placedKeys),
					),
				})),
			};
		case "columns":
			return {
				kind: "columns",
				content: node.content.map((col, index) => ({
					kind: "column" as const,
					id: `col-${index}`,
					width: 1,
					content: col.map((child) =>
						lowerFormTreeNode(child, pathPrefix, state, placedKeys),
					),
				})),
			};
		case "group":
			return {
				kind: "group",
				...(node.label !== undefined ? { label: node.label } : {}),
				content: node.content.map((child) =>
					lowerFormTreeNode(child, pathPrefix, state, placedKeys),
				),
			};
		default: {
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
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
 * Ensure client Ajv leaves for image/reference are `{ type: "string" }`.
 * Stamps already rematerialize via {@link rewriteClientJsonSchema}; form-tree
 * `.kind("image"|"reference")` chrome can also set semanticKind without a stamp.
 */
function setJsonSchemaAtPath(
	root: JsonSchemaNode,
	path: string,
	leaf: JsonSchemaNode,
): void {
	const segments = path.split(".").filter((s) => s.length > 0 && s !== "[]");
	if (segments.length === 0) return;

	let cursor: JsonSchemaNode = root;
	for (let i = 0; i < segments.length - 1; i++) {
		const key = segments[i]!;
		const props = asObject(cursor.properties);
		if (!props) return;
		const child = asObject(props[key]);
		if (!child) return;
		cursor = child;
	}

	const leafKey = segments[segments.length - 1]!;
	const props = asObject(cursor.properties);
	if (!props) return;
	props[leafKey] = leaf;
}

function applySemanticKindJsonSchemaRewrite(
	jsonSchema: JsonSchemaNode,
	fields: Readonly<Record<string, FormFieldDescriptor>>,
): void {
	for (const field of Object.values(fields)) {
		if (
			field.semanticKind === "image" ||
			field.semanticKind === "reference"
		) {
			setJsonSchemaAtPath(jsonSchema, field.path, { type: "string" });
		}
	}
}

/**
 * Project one collection Zod object schema into a serializable form model.
 * Thin internal form IR — not a user-authored algebra.
 * Optional {@link ProjectSchemaFormOptions.form} lowers a form tree into layout
 * and merges field-ref chrome onto descriptors.
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
	const state: WalkState = {
		fields: {},
		defaultLayoutByPath: {},
		childKeysByPath: {},
	};
	const props = asObject(jsonSchema.properties) ?? {};
	const required = new Set(
		Array.isArray(jsonSchema.required) ? (jsonSchema.required as string[]) : [],
	);
	const shape = zodObjectShape(unwrapZod(schema).inner) ?? {};
	const rootKeys: string[] = [];
	const content: FormLayoutNode[] = [];
	for (const key of Object.keys(props)) {
		const childJson = asObject(props[key]);
		if (!childJson) continue;
		// Use raw property JSON before rewrite for walk? We already rewrote —
		// stamps are recovered from Zod, kinds from rewritten + stamp.
		const rawProps = asObject(rawJson.properties) ?? {};
		const rawChild = asObject(rawProps[key]) ?? childJson;
		rootKeys.push(key);
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
	state.childKeysByPath[""] = rootKeys;

	// Fix field descriptors that used raw json for constraints but ensure
	// image/ref kinds win from stamps (already handled via stamp in kindFromJson).

	const layout: FormLayoutNode =
		options?.form !== undefined
			? { kind: "stack", content: lowerFormTreeScope(options.form, "", state) }
			: { kind: "stack", content };

	const clientJsonSchema: JsonSchemaNode = {
		type: "object",
		properties: asObject(jsonSchema.properties) ?? {},
		...(Array.isArray(jsonSchema.required)
			? { required: jsonSchema.required }
			: {}),
		additionalProperties: jsonSchema.additionalProperties ?? false,
	};
	applySemanticKindJsonSchemaRewrite(clientJsonSchema, state.fields);

	return {
		collectionId,
		layout,
		fields: state.fields,
		jsonSchema: clientJsonSchema,
	};
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
			...(options?.forms?.[id] !== undefined
				? { form: options.forms[id] }
				: {}),
		});
	}
	return out;
}
