/**
 * Authoring builders for the closed semantic algebra (ADR-0019).
 * Produce typed nodes consumed by `compileSemanticIr`. No Svelte.
 */

import type {
	NumberConstraint,
	OpaqueBinding,
	OpaqueProps,
	StringConstraint,
} from "./types";

/** Internal brand so compile rejects plain objects / unknown nodes. */
export const SEMANTIC_NODE = Symbol.for("@cms/core/semantic.node");

type Branded<T> = T & { readonly [SEMANTIC_NODE]: true };

function brand<T extends object>(node: T): Branded<T> {
	return Object.assign(node, { [SEMANTIC_NODE]: true as const });
}

export function isSemanticNode(
	value: unknown,
): value is Branded<{ type: string }> {
	return (
		typeof value === "object" &&
		value !== null &&
		SEMANTIC_NODE in value &&
		(value as { [SEMANTIC_NODE]?: unknown })[SEMANTIC_NODE] === true
	);
}

// ---------------------------------------------------------------------------
// Schema builders (fluent constraints on scalars)
// ---------------------------------------------------------------------------

export type SchemaNode =
	| StringNode
	| NumberNode
	| BooleanNode
	| LiteralNode
	| EnumNode
	| ImageNode
	| ReferenceNode
	| OptionalNode
	| NullableNode
	| DefaultNode
	| ObjectNode
	| ArrayNode
	| DiscriminatedUnionNode;

export type StringNode = Branded<{
	readonly type: "string";
	readonly constraints: readonly StringConstraint[];
}>;

export type NumberNode = Branded<{
	readonly type: "number";
	readonly constraints: readonly NumberConstraint[];
}>;

export type BooleanNode = Branded<{
	readonly type: "boolean";
}>;

export type LiteralNode = Branded<{
	readonly type: "literal";
	readonly value: string | number | boolean;
}>;

export type EnumNode = Branded<{
	readonly type: "enum";
	readonly values: readonly [string, ...string[]];
}>;

export type ImageNode = Branded<{
	readonly type: "image";
}>;

export type ReferenceNode = Branded<{
	readonly type: "reference";
	readonly collection: string;
}>;

export type OptionalNode = Branded<{
	readonly type: "optional";
	readonly of: SchemaNode;
}>;

export type NullableNode = Branded<{
	readonly type: "nullable";
	readonly of: SchemaNode;
}>;

export type DefaultNode = Branded<{
	readonly type: "default";
	readonly of: SchemaNode;
	readonly value: unknown;
}>;

export type FieldNode = Branded<{
	readonly type: "field";
	readonly id: string;
	readonly label?: string;
	readonly schema: SchemaNode;
	readonly component?: OpaqueBinding;
	readonly props?: OpaqueProps;
}>;

export type ObjectNode = Branded<{
	readonly type: "object";
	readonly id: string;
	readonly label?: string;
	readonly content: readonly TreeNode[];
	readonly component?: OpaqueBinding;
	readonly wrapper?: OpaqueBinding;
	readonly props?: OpaqueProps;
}>;

export type ArrayNode = Branded<{
	readonly type: "array";
	readonly id: string;
	readonly label?: string;
	readonly of: SchemaNode;
	readonly component?: OpaqueBinding;
	readonly wrapper?: OpaqueBinding;
	readonly props?: OpaqueProps;
}>;

export type DiscriminatedUnionNode = Branded<{
	readonly type: "discriminatedUnion";
	readonly id: string;
	readonly label?: string;
	readonly discriminant: string;
	readonly variants: readonly ObjectNode[];
}>;

export type TabNode = Branded<{
	readonly type: "tab";
	readonly id: string;
	readonly label: string;
	readonly icon?: OpaqueBinding;
	readonly content: readonly TreeNode[];
}>;

export type TabsNode = Branded<{
	readonly type: "tabs";
	readonly content: readonly TabNode[];
}>;

export type StackNode = Branded<{
	readonly type: "stack";
	readonly content: readonly TreeNode[];
}>;

export type ColumnNode = Branded<{
	readonly type: "column";
	readonly id: string;
	readonly width: number;
	readonly content: readonly TreeNode[];
}>;

export type ColumnsNode = Branded<{
	readonly type: "columns";
	readonly content: readonly ColumnNode[];
}>;

export type GroupNode = Branded<{
	readonly type: "group";
	readonly id?: string;
	readonly label?: string;
	readonly content: readonly TreeNode[];
}>;

export type HeaderNode = Branded<{
	readonly type: "header";
	readonly label: string;
}>;

export type SeparatorNode = Branded<{
	readonly type: "separator";
}>;

export type TreeNode =
	| FieldNode
	| ObjectNode
	| ArrayNode
	| DiscriminatedUnionNode
	| TabsNode
	| TabNode
	| StackNode
	| ColumnsNode
	| ColumnNode
	| GroupNode
	| HeaderNode
	| SeparatorNode;

export type GlobLoaderNode = Branded<{
	readonly type: "glob";
	readonly base: string;
	readonly pattern: string;
}>;

export type CollectionNode = Branded<{
	readonly type: "collection";
	readonly loader: GlobLoaderNode;
	readonly schema: TreeNode;
}>;

export type SemanticConfigInput = {
	readonly collections: Readonly<Record<string, CollectionNode>>;
};

function stringNode(constraints: readonly StringConstraint[] = []): StringNode {
	return brand({ type: "string" as const, constraints });
}

function numberNode(constraints: readonly NumberConstraint[] = []): NumberNode {
	return brand({ type: "number" as const, constraints });
}

type StringBuilder = StringNode & {
	min(value: number): StringBuilder;
	max(value: number): StringBuilder;
	regex(pattern: RegExp | string, flags?: string): StringBuilder;
	optional(): OptionalNode;
	nullable(): NullableNode;
	default(value: string): DefaultNode;
};

type NumberBuilder = NumberNode & {
	min(value: number): NumberBuilder;
	max(value: number): NumberBuilder;
	int(): NumberBuilder;
	optional(): OptionalNode;
	nullable(): NullableNode;
	default(value: number): DefaultNode;
};

type ImageBuilder = ImageNode & {
	optional(): OptionalNode;
	nullable(): NullableNode;
	default(value: unknown): DefaultNode;
};

type ReferenceBuilder = ReferenceNode & {
	optional(): OptionalNode;
	nullable(): NullableNode;
	default(value: unknown): DefaultNode;
};

type BooleanBuilder = BooleanNode & {
	optional(): OptionalNode;
	nullable(): NullableNode;
	default(value: boolean): DefaultNode;
};

function wrapMethods<T extends SchemaNode>(
	node: T,
): T & {
	optional(): OptionalNode;
	nullable(): NullableNode;
	default(value: unknown): DefaultNode;
} {
	return Object.assign(node, {
		optional(): OptionalNode {
			return brand({ type: "optional" as const, of: node });
		},
		nullable(): NullableNode {
			return brand({ type: "nullable" as const, of: node });
		},
		default(value: unknown): DefaultNode {
			return brand({ type: "default" as const, of: node, value });
		},
	});
}

function stringBuilder(
	constraints: readonly StringConstraint[] = [],
): StringBuilder {
	const node = stringNode(constraints);
	return Object.assign(wrapMethods(node), {
		min(value: number): StringBuilder {
			return stringBuilder([...constraints, { method: "min", value }]);
		},
		max(value: number): StringBuilder {
			return stringBuilder([...constraints, { method: "max", value }]);
		},
		regex(pattern: RegExp | string, flags?: string): StringBuilder {
			const source = typeof pattern === "string" ? pattern : pattern.source;
			const resolvedFlags =
				flags ?? (typeof pattern === "string" ? "" : pattern.flags);
			return stringBuilder([
				...constraints,
				{ method: "regex", source, flags: resolvedFlags },
			]);
		},
	}) as StringBuilder;
}

function numberBuilder(
	constraints: readonly NumberConstraint[] = [],
): NumberBuilder {
	const node = numberNode(constraints);
	return Object.assign(wrapMethods(node), {
		min(value: number): NumberBuilder {
			return numberBuilder([...constraints, { method: "min", value }]);
		},
		max(value: number): NumberBuilder {
			return numberBuilder([...constraints, { method: "max", value }]);
		},
		int(): NumberBuilder {
			return numberBuilder([...constraints, { method: "int" }]);
		},
	}) as NumberBuilder;
}

function imageBuilder(): ImageBuilder {
	return wrapMethods(brand({ type: "image" as const })) as ImageBuilder;
}

function referenceBuilder(collection: string): ReferenceBuilder {
	return wrapMethods(
		brand({ type: "reference" as const, collection }),
	) as ReferenceBuilder;
}

function booleanBuilder(): BooleanBuilder {
	return wrapMethods(brand({ type: "boolean" as const })) as BooleanBuilder;
}

/** Closed algebra builders — prefer this surface over hand-built IR. */
export const s = {
	string(): StringBuilder {
		return stringBuilder();
	},
	number(): NumberBuilder {
		return numberBuilder();
	},
	boolean(): BooleanBuilder {
		return booleanBuilder();
	},
	literal(value: string | number | boolean): LiteralNode {
		return brand({ type: "literal" as const, value });
	},
	enum<const T extends readonly [string, ...string[]]>(values: T): EnumNode {
		return brand({ type: "enum" as const, values });
	},
	image(): ImageBuilder {
		return imageBuilder();
	},
	reference(collection: string): ReferenceBuilder {
		return referenceBuilder(collection);
	},
	optional(of: SchemaNode): OptionalNode {
		return brand({ type: "optional" as const, of });
	},
	nullable(of: SchemaNode): NullableNode {
		return brand({ type: "nullable" as const, of });
	},
	default(of: SchemaNode, value: unknown): DefaultNode {
		return brand({ type: "default" as const, of, value });
	},
	field(opts: {
		id: string;
		label?: string;
		schema: SchemaNode;
		component?: OpaqueBinding;
		props?: OpaqueProps;
	}): FieldNode {
		return brand({
			type: "field" as const,
			id: opts.id,
			...(opts.label !== undefined ? { label: opts.label } : {}),
			schema: opts.schema,
			...(opts.component !== undefined ? { component: opts.component } : {}),
			...(opts.props !== undefined ? { props: opts.props } : {}),
		});
	},
	object(opts: {
		id: string;
		label?: string;
		content: readonly TreeNode[];
		component?: OpaqueBinding;
		wrapper?: OpaqueBinding;
		props?: OpaqueProps;
	}): ObjectNode {
		return brand({
			type: "object" as const,
			id: opts.id,
			...(opts.label !== undefined ? { label: opts.label } : {}),
			content: opts.content,
			...(opts.component !== undefined ? { component: opts.component } : {}),
			...(opts.wrapper !== undefined ? { wrapper: opts.wrapper } : {}),
			...(opts.props !== undefined ? { props: opts.props } : {}),
		});
	},
	array(opts: {
		id: string;
		label?: string;
		of: SchemaNode;
		component?: OpaqueBinding;
		wrapper?: OpaqueBinding;
		props?: OpaqueProps;
	}): ArrayNode {
		return brand({
			type: "array" as const,
			id: opts.id,
			...(opts.label !== undefined ? { label: opts.label } : {}),
			of: opts.of,
			...(opts.component !== undefined ? { component: opts.component } : {}),
			...(opts.wrapper !== undefined ? { wrapper: opts.wrapper } : {}),
			...(opts.props !== undefined ? { props: opts.props } : {}),
		});
	},
	discriminatedUnion(opts: {
		id: string;
		label?: string;
		discriminant: string;
		variants: readonly ObjectNode[];
	}): DiscriminatedUnionNode {
		return brand({
			type: "discriminatedUnion" as const,
			id: opts.id,
			...(opts.label !== undefined ? { label: opts.label } : {}),
			discriminant: opts.discriminant,
			variants: opts.variants,
		});
	},
	tabs(content: readonly TabNode[]): TabsNode {
		return brand({ type: "tabs" as const, content });
	},
	tab(opts: {
		id: string;
		label: string;
		icon?: OpaqueBinding;
		content: readonly TreeNode[];
	}): TabNode {
		return brand({
			type: "tab" as const,
			id: opts.id,
			label: opts.label,
			...(opts.icon !== undefined ? { icon: opts.icon } : {}),
			content: opts.content,
		});
	},
	stack(content: readonly TreeNode[]): StackNode {
		return brand({ type: "stack" as const, content });
	},
	columns(content: readonly ColumnNode[]): ColumnsNode {
		return brand({ type: "columns" as const, content });
	},
	column(opts: {
		id: string;
		width?: number;
		content: readonly TreeNode[];
	}): ColumnNode {
		return brand({
			type: "column" as const,
			id: opts.id,
			width: opts.width ?? 1,
			content: opts.content,
		});
	},
	group(opts: {
		id?: string;
		label?: string;
		content: readonly TreeNode[];
	}): GroupNode {
		return brand({
			type: "group" as const,
			...(opts.id !== undefined ? { id: opts.id } : {}),
			...(opts.label !== undefined ? { label: opts.label } : {}),
			content: opts.content,
		});
	},
	header(opts: { label: string }): HeaderNode {
		return brand({ type: "header" as const, label: opts.label });
	},
	separator(): SeparatorNode {
		return brand({ type: "separator" as const });
	},
	glob(opts: { base: string; pattern: string }): GlobLoaderNode {
		return brand({
			type: "glob" as const,
			base: opts.base,
			pattern: opts.pattern,
		});
	},
	collection(opts: {
		loader: GlobLoaderNode;
		schema: TreeNode;
	}): CollectionNode {
		return brand({
			type: "collection" as const,
			loader: opts.loader,
			schema: opts.schema,
		});
	},
} as const;
