/**
 * Serializable browser form / layout model projected from compiled IR (ADR-0019).
 * Presentation layout is preserved; persisted properties come only from durable nodes.
 * Opaque binding tokens are included for host Vite resolution — not live Svelte.
 */

import { persistedProjections } from "./persisted-projections";
import type {
	CompiledSemanticIr,
	IrArray,
	IrCollection,
	IrDiscriminatedUnion,
	IrField,
	IrObject,
	IrSchema,
	IrTreeNode,
	NumberConstraint,
	OpaqueBinding,
	OpaqueProps,
	SemanticKind,
	StringConstraint,
} from "./types";

// ---------------------------------------------------------------------------
// Field descriptors (durable)
// ---------------------------------------------------------------------------

/** Client-facing constraint summary for scalars. */
export type FormConstraintSummary =
	| { readonly method: "min"; readonly value: number }
	| { readonly method: "max"; readonly value: number }
	| { readonly method: "int" }
	| {
			readonly method: "regex";
			readonly source: string;
			readonly flags: string;
	  };

export type FormFieldDescriptor = {
	/** Path-local durable id (e.g. `title`, `seo.description`). */
	readonly path: string;
	readonly id: string;
	readonly label?: string;
	readonly semanticKind: SemanticKind;
	readonly optional: boolean;
	readonly nullable: boolean;
	readonly defaultValue?: unknown;
	readonly constraints?: readonly FormConstraintSummary[];
	readonly enumValues?: readonly [string, ...string[]];
	readonly literalValue?: string | number | boolean;
	/** Target collection for `reference` kinds. */
	readonly referenceCollection?: string;
	/** Opaque editor override token (host resolves via Vite). */
	readonly component?: OpaqueBinding;
	/** Opaque wrapper token (objects/arrays). */
	readonly wrapper?: OpaqueBinding;
	readonly props?: OpaqueProps;
};

// ---------------------------------------------------------------------------
// Layout AST (presentation + durable leaf refs)
// ---------------------------------------------------------------------------

export type FormLayoutFieldRef = {
	readonly kind: "field";
	readonly path: string;
};

export type FormLayoutObject = {
	readonly kind: "object";
	readonly path: string;
	readonly content: readonly FormLayoutNode[];
	readonly component?: OpaqueBinding;
	readonly wrapper?: OpaqueBinding;
};

export type FormLayoutArray = {
	readonly kind: "array";
	readonly path: string;
	/** Item layout when the element schema is an object; otherwise omitted. */
	readonly item?: FormLayoutNode;
	readonly component?: OpaqueBinding;
	readonly wrapper?: OpaqueBinding;
};

export type FormLayoutUnionVariant = {
	readonly id: string;
	readonly label?: string;
	readonly content: readonly FormLayoutNode[];
};

export type FormLayoutUnion = {
	readonly kind: "discriminatedUnion";
	readonly path: string;
	readonly discriminant: string;
	readonly variants: readonly FormLayoutUnionVariant[];
};

export type FormLayoutTab = {
	readonly kind: "tab";
	readonly id: string;
	readonly label: string;
	readonly icon?: OpaqueBinding;
	readonly content: readonly FormLayoutNode[];
};

export type FormLayoutTabs = {
	readonly kind: "tabs";
	readonly content: readonly FormLayoutTab[];
};

export type FormLayoutStack = {
	readonly kind: "stack";
	readonly content: readonly FormLayoutNode[];
};

export type FormLayoutColumn = {
	readonly kind: "column";
	readonly id: string;
	readonly width: number;
	readonly content: readonly FormLayoutNode[];
};

export type FormLayoutColumns = {
	readonly kind: "columns";
	readonly content: readonly FormLayoutColumn[];
};

export type FormLayoutGroup = {
	readonly kind: "group";
	readonly id?: string;
	readonly label?: string;
	readonly content: readonly FormLayoutNode[];
};

export type FormLayoutHeader = {
	readonly kind: "header";
	readonly label: string;
};

export type FormLayoutSeparator = {
	readonly kind: "separator";
};

export type FormLayoutNode =
	| FormLayoutFieldRef
	| FormLayoutObject
	| FormLayoutArray
	| FormLayoutUnion
	| FormLayoutTabs
	| FormLayoutTab
	| FormLayoutStack
	| FormLayoutColumns
	| FormLayoutColumn
	| FormLayoutGroup
	| FormLayoutHeader
	| FormLayoutSeparator;

export type CollectionFormModel = {
	readonly collectionId: string;
	/** Presentation + durable refs — never invents persisted keys. */
	readonly layout: FormLayoutNode;
	/** Durable field descriptors keyed by path. */
	readonly fields: Readonly<Record<string, FormFieldDescriptor>>;
	/**
	 * Portable JSON Schema for client structural validation (persisted input).
	 * Derived from IR (ADR-0019).
	 */
	readonly jsonSchema: Record<string, unknown>;
};

export type FormModelsByCollection = Readonly<
	Record<string, CollectionFormModel>
>;

// ---------------------------------------------------------------------------
// Schema unwrap / descriptor helpers
// ---------------------------------------------------------------------------

type Unwrapped = {
	inner: IrSchema;
	optional: boolean;
	nullable: boolean;
	defaultValue?: unknown;
};

function unwrapSchema(schema: IrSchema): Unwrapped {
	let optional = false;
	let nullable = false;
	let defaultValue: unknown;
	let inner: IrSchema = schema;
	while (
		inner.kind === "optional" ||
		inner.kind === "nullable" ||
		inner.kind === "default"
	) {
		if (inner.kind === "optional") optional = true;
		else if (inner.kind === "nullable") nullable = true;
		else {
			defaultValue = inner.value;
		}
		inner = inner.of;
	}
	return {
		inner,
		optional,
		nullable,
		...(defaultValue !== undefined ? { defaultValue } : {}),
	};
}

function joinPath(parent: string, id: string): string {
	return parent === "" ? id : `${parent}.${id}`;
}

function constraintsFromInner(
	inner: IrSchema,
): readonly FormConstraintSummary[] | undefined {
	if (inner.kind === "string" && inner.constraints.length > 0) {
		return inner.constraints as readonly StringConstraint[];
	}
	if (inner.kind === "number" && inner.constraints.length > 0) {
		return inner.constraints as readonly NumberConstraint[];
	}
	return undefined;
}

function descriptorFromField(
	field: IrField,
	path: string,
): FormFieldDescriptor {
	const { inner, optional, nullable, defaultValue } = unwrapSchema(
		field.schema,
	);
	const base: FormFieldDescriptor = {
		path,
		id: field.id,
		...(field.label !== undefined ? { label: field.label } : {}),
		semanticKind: field.semanticKind,
		optional,
		nullable,
		...(defaultValue !== undefined ? { defaultValue } : {}),
		...(field.component !== undefined ? { component: field.component } : {}),
		...(field.props !== undefined ? { props: field.props } : {}),
	};

	const constraints = constraintsFromInner(inner);
	if (constraints) {
		return { ...base, constraints };
	}
	if (inner.kind === "enum") {
		return { ...base, enumValues: inner.values };
	}
	if (inner.kind === "literal") {
		return { ...base, literalValue: inner.value };
	}
	if (inner.kind === "reference") {
		return { ...base, referenceCollection: inner.collection };
	}
	return base;
}

function descriptorFromObject(
	node: IrObject,
	path: string,
): FormFieldDescriptor {
	return {
		path,
		id: node.id,
		...(node.label !== undefined ? { label: node.label } : {}),
		semanticKind: "object",
		optional: false,
		nullable: false,
		...(node.component !== undefined ? { component: node.component } : {}),
		...(node.wrapper !== undefined ? { wrapper: node.wrapper } : {}),
		...(node.props !== undefined ? { props: node.props } : {}),
	};
}

function descriptorFromArray(node: IrArray, path: string): FormFieldDescriptor {
	return {
		path,
		id: node.id,
		...(node.label !== undefined ? { label: node.label } : {}),
		semanticKind: "array",
		optional: false,
		nullable: false,
		...(node.component !== undefined ? { component: node.component } : {}),
		...(node.wrapper !== undefined ? { wrapper: node.wrapper } : {}),
		...(node.props !== undefined ? { props: node.props } : {}),
	};
}

function descriptorFromUnion(
	node: IrDiscriminatedUnion,
	path: string,
): FormFieldDescriptor {
	return {
		path,
		id: node.id,
		...(node.label !== undefined ? { label: node.label } : {}),
		semanticKind: "discriminatedUnion",
		optional: false,
		nullable: false,
	};
}

// ---------------------------------------------------------------------------
// Layout walk
// ---------------------------------------------------------------------------

type WalkState = {
	fields: Record<string, FormFieldDescriptor>;
};

function layoutFromSchemaItem(
	schema: IrSchema,
	parentPath: string,
	state: WalkState,
): FormLayoutNode | undefined {
	const { inner } = unwrapSchema(schema);
	if (inner.kind === "object") {
		// Nested object-as-schema uses the object's own id when present.
		const path = joinPath(parentPath, inner.id);
		state.fields[path] = descriptorFromObject(inner, path);
		return {
			kind: "object",
			path,
			content: inner.content.map((c) => layoutFromTree(c, path, state)),
			...(inner.component !== undefined ? { component: inner.component } : {}),
			...(inner.wrapper !== undefined ? { wrapper: inner.wrapper } : {}),
		};
	}
	return undefined;
}

function layoutFromTree(
	node: IrTreeNode,
	parentPath: string,
	state: WalkState,
): FormLayoutNode {
	switch (node.kind) {
		case "field": {
			const path = joinPath(parentPath, node.id);
			state.fields[path] = descriptorFromField(node, path);
			return { kind: "field", path };
		}
		case "object": {
			const path = joinPath(parentPath, node.id);
			state.fields[path] = descriptorFromObject(node, path);
			return {
				kind: "object",
				path,
				content: node.content.map((c) => layoutFromTree(c, path, state)),
				...(node.component !== undefined ? { component: node.component } : {}),
				...(node.wrapper !== undefined ? { wrapper: node.wrapper } : {}),
			};
		}
		case "array": {
			const path = joinPath(parentPath, node.id);
			state.fields[path] = descriptorFromArray(node, path);
			const item = layoutFromSchemaItem(node.of, `${path}[]`, state);
			return {
				kind: "array",
				path,
				...(item !== undefined ? { item } : {}),
				...(node.component !== undefined ? { component: node.component } : {}),
				...(node.wrapper !== undefined ? { wrapper: node.wrapper } : {}),
			};
		}
		case "discriminatedUnion": {
			const path = joinPath(parentPath, node.id);
			state.fields[path] = descriptorFromUnion(node, path);
			return {
				kind: "discriminatedUnion",
				path,
				discriminant: node.discriminant,
				variants: node.variants.map((variant) => {
					const variantPath = `${path}.${variant.id}`;
					return {
						id: variant.id,
						...(variant.label !== undefined ? { label: variant.label } : {}),
						content: variant.content.map((c) =>
							layoutFromTree(c, variantPath, state),
						),
					};
				}),
			};
		}
		case "tabs":
			return {
				kind: "tabs",
				content: node.content.map((tab) => ({
					kind: "tab" as const,
					id: tab.id,
					label: tab.label,
					...(tab.icon !== undefined ? { icon: tab.icon } : {}),
					content: tab.content.map((c) => layoutFromTree(c, parentPath, state)),
				})),
			};
		case "tab":
			return {
				kind: "tab",
				id: node.id,
				label: node.label,
				...(node.icon !== undefined ? { icon: node.icon } : {}),
				content: node.content.map((c) => layoutFromTree(c, parentPath, state)),
			};
		case "stack":
			return {
				kind: "stack",
				content: node.content.map((c) => layoutFromTree(c, parentPath, state)),
			};
		case "columns":
			return {
				kind: "columns",
				content: node.content.map((col) => ({
					kind: "column" as const,
					id: col.id,
					width: col.width,
					content: col.content.map((c) => layoutFromTree(c, parentPath, state)),
				})),
			};
		case "column":
			return {
				kind: "column",
				id: node.id,
				width: node.width,
				content: node.content.map((c) => layoutFromTree(c, parentPath, state)),
			};
		case "group":
			return {
				kind: "group",
				...(node.id !== undefined ? { id: node.id } : {}),
				...(node.label !== undefined ? { label: node.label } : {}),
				content: node.content.map((c) => layoutFromTree(c, parentPath, state)),
			};
		case "header":
			return { kind: "header", label: node.label };
		case "separator":
			return { kind: "separator" };
		default: {
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
}

// ---------------------------------------------------------------------------
// Public projection
// ---------------------------------------------------------------------------

/**
 * Project one compiled collection into a serializable form/layout model.
 * Layout keeps presentation; `jsonSchema` is the persisted-input projection
 * (from `persistedProjections(ir).jsonSchemas()`).
 */
export function projectCollectionFormModel(
	collection: IrCollection,
	jsonSchema: Record<string, unknown>,
): CollectionFormModel {
	const state: WalkState = { fields: {} };
	const layout = layoutFromTree(collection.schema, "", state);
	return {
		collectionId: collection.id,
		layout,
		fields: state.fields,
		jsonSchema,
	};
}

/**
 * Project every collection on compiled IR into form models.
 */
export function projectFormModels(
	ir: CompiledSemanticIr,
): FormModelsByCollection {
	const jsonSchemas = persistedProjections(ir).jsonSchemas();
	const out: Record<string, CollectionFormModel> = {};
	for (const [id, collection] of Object.entries(ir.collections)) {
		out[id] = projectCollectionFormModel(
			collection,
			jsonSchemas[id] ?? {
				type: "object",
				properties: {},
				additionalProperties: false,
			},
		);
	}
	return out;
}
