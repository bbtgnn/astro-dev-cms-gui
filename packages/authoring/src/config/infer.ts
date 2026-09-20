/**
 * Tuple → persisted input shape: map durable nodes by literal `id`, drop
 * header/separator, flatten presentation containers one structural level.
 */

import type {
	ArrayNode,
	DiscriminatedUnionNode,
	FieldNode,
	HeaderNode,
	ObjectNode,
	SchemaNode,
	SeparatorNode,
} from "@cms/core/semantic";
import type { FieldKind } from "./contracts";

/** Phantom Input/Kind bag (type-only; builders cast onto core nodes). */
export type CmsPhantoms<Input, Kind extends FieldKind = FieldKind> = {
	readonly __cms: { readonly input: Input; readonly kind: Kind };
};

/** Attach compile-time Input / Kind (not present at runtime). */
export type WithInput<N, Input, Kind extends FieldKind = FieldKind> = N &
	CmsPhantoms<Input, Kind>;

export type TypedSchema<Input, Kind extends FieldKind = FieldKind> = WithInput<
	SchemaNode,
	Input,
	Kind
>;

/** Loose schema bound for builder params. */
export type AnyTypedSchema = SchemaNode & CmsPhantoms<unknown, FieldKind>;

export type TypedFieldNode<
	Id extends string,
	Input,
	Kind extends FieldKind = FieldKind,
> = WithInput<FieldNode, Input, Kind> & { readonly id: Id };

export type TypedObjectNode<Id extends string, Input> = WithInput<
	ObjectNode,
	Input,
	"object"
> & { readonly id: Id };

export type TypedArrayNode<Id extends string, Input> = WithInput<
	ArrayNode,
	Input,
	"array"
> & { readonly id: Id };

export type TypedUnionNode<Id extends string, Input> = WithInput<
	DiscriminatedUnionNode,
	Input,
	"discriminatedUnion"
> & { readonly id: Id };

export type TypedDurableNode =
	| TypedFieldNode<string, unknown, FieldKind>
	| TypedObjectNode<string, unknown>
	| TypedArrayNode<string, unknown>
	| TypedUnionNode<string, unknown>;

export type TypedStackNode<Content extends readonly TypedTreeNode[]> = {
	readonly type: "stack";
	readonly content: Content;
};

export type TypedGroupNode<Content extends readonly TypedTreeNode[]> = {
	readonly type: "group";
	readonly id?: string;
	readonly label?: string;
	readonly content: Content;
};

export type TypedTabNode<Content extends readonly TypedTreeNode[]> = {
	readonly type: "tab";
	readonly id: string;
	readonly label: string;
	readonly content: Content;
};

export type TypedTabsNode<Tabs extends readonly TypedTreeNode[]> = {
	readonly type: "tabs";
	readonly content: Tabs;
};

export type TypedColumnNode<Content extends readonly TypedTreeNode[]> = {
	readonly type: "column";
	readonly id: string;
	readonly width: number;
	readonly content: Content;
};

export type TypedColumnsNode<Cols extends readonly TypedTreeNode[]> = {
	readonly type: "columns";
	readonly content: Cols;
};

export type TypedTreeNode =
	| TypedDurableNode
	| HeaderNode
	| SeparatorNode
	| TypedStackNode<readonly TypedTreeNode[]>
	| TypedGroupNode<readonly TypedTreeNode[]>
	| TypedTabNode<readonly TypedTreeNode[]>
	| TypedTabsNode<readonly TypedTreeNode[]>
	| TypedColumnNode<readonly TypedTreeNode[]>
	| TypedColumnsNode<readonly TypedTreeNode[]>;

export type InputOfSchema<S> = S extends {
	readonly __cms: { readonly input: infer I };
}
	? I
	: unknown;

export type KindOfSchema<S> = S extends {
	readonly __cms: { readonly kind: infer K };
}
	? K extends FieldKind
		? K
		: FieldKind
	: FieldKind;

export type InputOfNode<N> = N extends {
	readonly __cms: { readonly input: infer I };
}
	? I
	: never;

export type IdOfNode<N> = N extends { readonly id: infer Id }
	? Id extends string
		? Id
		: never
	: never;

type PresentationLeaf = HeaderNode | SeparatorNode;

type UnionToIntersection<U> = (
	U extends unknown
		? (k: U) => void
		: never
) extends (k: infer I) => void
	? I
	: never;

/** Direct durable children only (no container walk). */
type DirectDurableShape<Content extends readonly TypedTreeNode[]> = {
	[N in Content[number] as N extends PresentationLeaf
		? never
		: N extends TypedDurableNode
			? IdOfNode<N>
			: never]: N extends TypedDurableNode ? InputOfNode<N> : never;
};

/** One-level flatten of presentation containers' direct durable children. */
type NestedContainerShape<N> = N extends {
	readonly type: "stack" | "group" | "tabs" | "columns" | "tab" | "column";
	readonly content: infer C extends readonly TypedTreeNode[];
}
	? DirectDurableShape<C> &
			UnionToIntersection<
				C[number] extends infer Child
					? Child extends {
							readonly type:
								| "stack"
								| "group"
								| "tabs"
								| "columns"
								| "tab"
								| "column";
							readonly content: infer Inner extends readonly TypedTreeNode[];
						}
						? DirectDurableShape<Inner>
						: unknown
					: never
			>
	: unknown;

/**
 * Persisted object input from a `content` tuple: durable ids → inputs;
 * header/separator dropped; presentation containers flattened (two levels).
 */
export type ShapeOfContent<Content extends readonly TypedTreeNode[]> =
	DirectDurableShape<Content> &
		UnionToIntersection<NestedContainerShape<Content[number]>>;
