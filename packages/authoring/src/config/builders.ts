/**
 * Typed CMS schema builders: core `s` at runtime + catalog key contracts at
 * the type level (ADR-0019 residual 4.1). Opaque bindings are string keys into
 * a Vite-only components catalog — generation stays Svelte-free.
 */

import {
	type BooleanNode,
	type CollectionNode,
	type ColumnNode,
	s as coreS,
	type GlobLoaderNode,
	type HeaderNode,
	type ImageNode,
	type NumberNode,
	type ObjectNode,
	type ReferenceNode,
	type SchemaNode,
	type SeparatorNode,
	type StringNode,
	type TabNode,
	type TreeNode,
} from "@cms/core/semantic";
import type {
	CompatibleIconKey,
	CompatibleKey,
	CompatibleWrapperKey,
	ComponentsCatalog,
	EmptyComponents,
	FieldKind,
	PropsBagOption,
} from "./contracts";
import type {
	AnyTypedSchema,
	InputOfSchema,
	KindOfSchema,
	ShapeOfContent,
	TypedArrayNode,
	TypedColumnNode,
	TypedColumnsNode,
	TypedFieldNode,
	TypedGroupNode,
	TypedObjectNode,
	TypedSchema,
	TypedStackNode,
	TypedTabNode,
	TypedTabsNode,
	TypedTreeNode,
	TypedUnionNode,
	WithInput,
} from "./infer";

function mark<Input, Kind extends FieldKind, N>(
	node: N,
): WithInput<N, Input, Kind> {
	return node as WithInput<N, Input, Kind>;
}

type StringBuilder = WithInput<StringNode, string, "string"> & {
	min(value: number): StringBuilder;
	max(value: number): StringBuilder;
	regex(pattern: RegExp | string, flags?: string): StringBuilder;
	optional(): TypedSchema<string | undefined, "string">;
	nullable(): TypedSchema<string | null, "string">;
	default(value: string): TypedSchema<string, "string">;
};

type NumberBuilder = WithInput<NumberNode, number, "number"> & {
	min(value: number): NumberBuilder;
	max(value: number): NumberBuilder;
	int(): NumberBuilder;
	optional(): TypedSchema<number | undefined, "number">;
	nullable(): TypedSchema<number | null, "number">;
	default(value: number): TypedSchema<number, "number">;
};

type BooleanBuilder = WithInput<BooleanNode, boolean, "boolean"> & {
	optional(): TypedSchema<boolean | undefined, "boolean">;
	nullable(): TypedSchema<boolean | null, "boolean">;
	default(value: boolean): TypedSchema<boolean, "boolean">;
};

type ImageBuilder = WithInput<ImageNode, string, "image"> & {
	optional(): TypedSchema<string | undefined, "image">;
	nullable(): TypedSchema<string | null, "image">;
	default(value: string): TypedSchema<string, "image">;
};

type ReferenceBuilder = WithInput<ReferenceNode, string, "reference"> & {
	optional(): TypedSchema<string | undefined, "reference">;
	nullable(): TypedSchema<string | null, "reference">;
	default(value: string): TypedSchema<string, "reference">;
};

function wrapString(node: ReturnType<typeof coreS.string>): StringBuilder {
	return Object.assign({}, mark<string, "string", StringNode>(node), {
		min(value: number): StringBuilder {
			return wrapString(node.min(value));
		},
		max(value: number): StringBuilder {
			return wrapString(node.max(value));
		},
		regex(pattern: RegExp | string, flags?: string): StringBuilder {
			return wrapString(node.regex(pattern, flags));
		},
		optional(): TypedSchema<string | undefined, "string"> {
			return mark(node.optional()) as TypedSchema<string | undefined, "string">;
		},
		nullable(): TypedSchema<string | null, "string"> {
			return mark(node.nullable()) as TypedSchema<string | null, "string">;
		},
		default(value: string): TypedSchema<string, "string"> {
			return mark(node.default(value)) as TypedSchema<string, "string">;
		},
	}) as StringBuilder;
}

function wrapNumber(node: ReturnType<typeof coreS.number>): NumberBuilder {
	return Object.assign({}, mark<number, "number", NumberNode>(node), {
		min(value: number): NumberBuilder {
			return wrapNumber(node.min(value));
		},
		max(value: number): NumberBuilder {
			return wrapNumber(node.max(value));
		},
		int(): NumberBuilder {
			return wrapNumber(node.int());
		},
		optional(): TypedSchema<number | undefined, "number"> {
			return mark(node.optional()) as TypedSchema<number | undefined, "number">;
		},
		nullable(): TypedSchema<number | null, "number"> {
			return mark(node.nullable()) as TypedSchema<number | null, "number">;
		},
		default(value: number): TypedSchema<number, "number"> {
			return mark(node.default(value)) as TypedSchema<number, "number">;
		},
	}) as NumberBuilder;
}

function wrapBoolean(node: ReturnType<typeof coreS.boolean>): BooleanBuilder {
	return Object.assign({}, mark<boolean, "boolean", BooleanNode>(node), {
		optional(): TypedSchema<boolean | undefined, "boolean"> {
			return mark(node.optional()) as TypedSchema<
				boolean | undefined,
				"boolean"
			>;
		},
		nullable(): TypedSchema<boolean | null, "boolean"> {
			return mark(node.nullable()) as TypedSchema<boolean | null, "boolean">;
		},
		default(value: boolean): TypedSchema<boolean, "boolean"> {
			return mark(node.default(value)) as TypedSchema<boolean, "boolean">;
		},
	}) as BooleanBuilder;
}

function wrapImage(node: ReturnType<typeof coreS.image>): ImageBuilder {
	return Object.assign({}, mark<string, "image", ImageNode>(node), {
		optional(): TypedSchema<string | undefined, "image"> {
			return mark(node.optional()) as TypedSchema<string | undefined, "image">;
		},
		nullable(): TypedSchema<string | null, "image"> {
			return mark(node.nullable()) as TypedSchema<string | null, "image">;
		},
		default(value: string): TypedSchema<string, "image"> {
			return mark(node.default(value)) as TypedSchema<string, "image">;
		},
	}) as ImageBuilder;
}

function wrapReference(
	node: ReturnType<typeof coreS.reference>,
): ReferenceBuilder {
	return Object.assign({}, mark<string, "reference", ReferenceNode>(node), {
		optional(): TypedSchema<string | undefined, "reference"> {
			return mark(node.optional()) as TypedSchema<
				string | undefined,
				"reference"
			>;
		},
		nullable(): TypedSchema<string | null, "reference"> {
			return mark(node.nullable()) as TypedSchema<string | null, "reference">;
		},
		default(value: string): TypedSchema<string, "reference"> {
			return mark(node.default(value)) as TypedSchema<string, "reference">;
		},
	}) as ReferenceBuilder;
}

type FieldOptsBase<Id extends string, S extends AnyTypedSchema> = {
	id: Id;
	label?: string;
	schema: S;
};

type FieldWithComponentKey<
	Id extends string,
	S extends AnyTypedSchema,
	Components extends ComponentsCatalog,
	K extends CompatibleKey<Components, InputOfSchema<S>, KindOfSchema<S>>,
> = FieldOptsBase<Id, S> & {
	component: K;
} & PropsBagOption<Components[K]>;

type FieldStock<Id extends string, S extends AnyTypedSchema> = FieldOptsBase<
	Id,
	S
> & {
	component?: undefined;
	props?: undefined;
};

type ObjectStock<
	Id extends string,
	Content extends readonly TypedTreeNode[],
> = {
	id: Id;
	label?: string;
	content: Content;
	component?: undefined;
	wrapper?: undefined;
	props?: undefined;
};

type ObjectWithComponentKey<
	Id extends string,
	Content extends readonly TypedTreeNode[],
	Components extends ComponentsCatalog,
	K extends CompatibleKey<Components, ShapeOfContent<Content>, "object">,
> = {
	id: Id;
	label?: string;
	content: Content;
	component: K;
	wrapper?: never;
} & PropsBagOption<Components[K]>;

type ObjectWithWrapperKey<
	Id extends string,
	Content extends readonly TypedTreeNode[],
	Components extends ComponentsCatalog,
	W extends CompatibleWrapperKey<Components>,
> = {
	id: Id;
	label?: string;
	content: Content;
	wrapper: W;
	component?: never;
} & PropsBagOption<Components[W]>;

type ArrayStock<Id extends string, S extends AnyTypedSchema> = {
	id: Id;
	label?: string;
	of: S;
	component?: undefined;
	wrapper?: undefined;
	props?: undefined;
};

type ArrayWithComponentKey<
	Id extends string,
	S extends AnyTypedSchema,
	Components extends ComponentsCatalog,
	K extends CompatibleKey<Components, InputOfSchema<S>[], "array">,
> = {
	id: Id;
	label?: string;
	of: S;
	component: K;
	wrapper?: never;
} & PropsBagOption<Components[K]>;

type ArrayWithWrapperKey<
	Id extends string,
	S extends AnyTypedSchema,
	Components extends ComponentsCatalog,
	W extends CompatibleWrapperKey<Components>,
> = {
	id: Id;
	label?: string;
	of: S;
	wrapper: W;
	component?: never;
} & PropsBagOption<Components[W]>;

export type CmsConfigInput = {
	readonly collections: Readonly<Record<string, CollectionNode>>;
	readonly getPreviewUrl?: (
		collection: string,
		id: string,
	) => string | null | undefined;
};

export type CmsBuilders<
	Collections extends string = string,
	Components extends ComponentsCatalog = EmptyComponents,
> = {
	string(): StringBuilder;
	number(): NumberBuilder;
	boolean(): BooleanBuilder;
	literal<const V extends string | number | boolean>(
		value: V,
	): TypedSchema<V, "literal">;
	enum<const T extends readonly [string, ...string[]]>(
		values: T,
	): TypedSchema<T[number], "enum">;
	image(): ImageBuilder;
	reference(collection: Collections): ReferenceBuilder;
	optional<Input, Kind extends FieldKind>(
		of: TypedSchema<Input, Kind>,
	): TypedSchema<Input | undefined, Kind>;
	nullable<Input, Kind extends FieldKind>(
		of: TypedSchema<Input, Kind>,
	): TypedSchema<Input | null, Kind>;
	default<Input, Kind extends FieldKind>(
		of: TypedSchema<Input, Kind>,
		value: Input,
	): TypedSchema<Input, Kind>;

	field<
		const Id extends string,
		S extends AnyTypedSchema,
		const K extends CompatibleKey<
			Components,
			InputOfSchema<S>,
			KindOfSchema<S>
		>,
	>(
		opts: FieldWithComponentKey<Id, S, Components, K>,
	): TypedFieldNode<Id, InputOfSchema<S>, KindOfSchema<S>>;
	field<const Id extends string, S extends AnyTypedSchema>(
		opts: FieldStock<Id, S>,
	): TypedFieldNode<Id, InputOfSchema<S>, KindOfSchema<S>>;

	object<
		const Id extends string,
		const Content extends readonly TypedTreeNode[],
		const K extends CompatibleKey<
			Components,
			ShapeOfContent<Content>,
			"object"
		>,
	>(
		opts: ObjectWithComponentKey<Id, Content, Components, K>,
	): TypedObjectNode<Id, ShapeOfContent<Content>>;
	object<
		const Id extends string,
		const Content extends readonly TypedTreeNode[],
		const W extends CompatibleWrapperKey<Components>,
	>(
		opts: ObjectWithWrapperKey<Id, Content, Components, W>,
	): TypedObjectNode<Id, ShapeOfContent<Content>>;
	object<
		const Id extends string,
		const Content extends readonly TypedTreeNode[],
	>(
		opts: ObjectStock<Id, Content>,
	): TypedObjectNode<Id, ShapeOfContent<Content>>;

	array<
		const Id extends string,
		S extends AnyTypedSchema,
		const K extends CompatibleKey<Components, InputOfSchema<S>[], "array">,
	>(
		opts: ArrayWithComponentKey<Id, S, Components, K>,
	): TypedArrayNode<Id, InputOfSchema<S>[]>;
	array<
		const Id extends string,
		S extends AnyTypedSchema,
		const W extends CompatibleWrapperKey<Components>,
	>(
		opts: ArrayWithWrapperKey<Id, S, Components, W>,
	): TypedArrayNode<Id, InputOfSchema<S>[]>;
	array<const Id extends string, S extends AnyTypedSchema>(
		opts: ArrayStock<Id, S>,
	): TypedArrayNode<Id, InputOfSchema<S>[]>;

	discriminatedUnion<
		const Id extends string,
		const Variants extends readonly TypedObjectNode<string, unknown>[],
	>(opts: {
		id: Id;
		label?: string;
		discriminant: string;
		variants: Variants;
	}): TypedUnionNode<
		Id,
		{
			[V in Variants[number] as V["id"]]: InputOfNodeVariant<V>;
		}[Variants[number]["id"]]
	>;

	tabs<const Tabs extends readonly TypedTabNode<readonly TypedTreeNode[]>[]>(
		content: Tabs,
	): TypedTabsNode<Tabs>;
	tab<const Content extends readonly TypedTreeNode[]>(opts: {
		id: string;
		label: string;
		icon?: CompatibleIconKey<Components>;
		content: Content;
	}): TypedTabNode<Content>;
	stack<const Content extends readonly TypedTreeNode[]>(
		content: Content,
	): TypedStackNode<Content>;
	columns<
		const Cols extends readonly TypedColumnNode<readonly TypedTreeNode[]>[],
	>(content: Cols): TypedColumnsNode<Cols>;
	column<const Content extends readonly TypedTreeNode[]>(opts: {
		id: string;
		width?: number;
		content: Content;
	}): TypedColumnNode<Content>;
	group<const Content extends readonly TypedTreeNode[]>(opts: {
		id?: string;
		label?: string;
		content: Content;
	}): TypedGroupNode<Content>;
	header(opts: { label: string }): HeaderNode;
	separator(): SeparatorNode;
	glob(opts: { base: string; pattern: string }): GlobLoaderNode;
	collection(opts: {
		loader: GlobLoaderNode;
		schema: TypedTreeNode;
	}): CollectionNode;
};

type InputOfNodeVariant<V> =
	V extends TypedObjectNode<string, infer I> ? I : unknown;

/**
 * Builders for `defineCms` / host `cms.config.ts`. Collection generics type
 * `reference()` targets; `Components` constrains catalog string keys.
 */
export function createCmsBuilders<
	Collections extends string = string,
	Components extends ComponentsCatalog = EmptyComponents,
>(): CmsBuilders<Collections, Components> {
	const builders = {
		string(): StringBuilder {
			return wrapString(coreS.string());
		},
		number(): NumberBuilder {
			return wrapNumber(coreS.number());
		},
		boolean(): BooleanBuilder {
			return wrapBoolean(coreS.boolean());
		},
		literal<const V extends string | number | boolean>(
			value: V,
		): TypedSchema<V, "literal"> {
			return mark(coreS.literal(value));
		},
		enum<const T extends readonly [string, ...string[]]>(
			values: T,
		): TypedSchema<T[number], "enum"> {
			return mark(coreS.enum(values));
		},
		image(): ImageBuilder {
			return wrapImage(coreS.image());
		},
		reference(collection: Collections): ReferenceBuilder {
			return wrapReference(coreS.reference(collection));
		},
		optional<Input, Kind extends FieldKind>(
			of: TypedSchema<Input, Kind>,
		): TypedSchema<Input | undefined, Kind> {
			return mark(coreS.optional(of as SchemaNode));
		},
		nullable<Input, Kind extends FieldKind>(
			of: TypedSchema<Input, Kind>,
		): TypedSchema<Input | null, Kind> {
			return mark(coreS.nullable(of as SchemaNode));
		},
		default<Input, Kind extends FieldKind>(
			of: TypedSchema<Input, Kind>,
			value: Input,
		): TypedSchema<Input, Kind> {
			return mark(coreS.default(of as SchemaNode, value));
		},

		field(opts: {
			id: string;
			label?: string;
			schema: AnyTypedSchema;
			component?: string;
			props?: Record<string, unknown>;
		}): TypedFieldNode<string, unknown, FieldKind> {
			return mark(
				coreS.field({
					id: opts.id,
					...(opts.label !== undefined ? { label: opts.label } : {}),
					schema: opts.schema as SchemaNode,
					...(opts.component !== undefined
						? { component: opts.component }
						: {}),
					...(opts.props !== undefined ? { props: opts.props } : {}),
				}),
			);
		},

		object(opts: {
			id: string;
			label?: string;
			content: readonly TypedTreeNode[];
			component?: string;
			wrapper?: string;
			props?: Record<string, unknown>;
		}): TypedObjectNode<string, unknown> {
			return mark(
				coreS.object({
					id: opts.id,
					...(opts.label !== undefined ? { label: opts.label } : {}),
					content: opts.content as readonly TreeNode[],
					...(opts.component !== undefined
						? { component: opts.component }
						: {}),
					...(opts.wrapper !== undefined ? { wrapper: opts.wrapper } : {}),
					...(opts.props !== undefined ? { props: opts.props } : {}),
				}),
			) as TypedObjectNode<string, unknown>;
		},

		array(opts: {
			id: string;
			label?: string;
			of: AnyTypedSchema;
			component?: string;
			wrapper?: string;
			props?: Record<string, unknown>;
		}): TypedArrayNode<string, unknown[]> {
			return mark(
				coreS.array({
					id: opts.id,
					...(opts.label !== undefined ? { label: opts.label } : {}),
					of: opts.of as SchemaNode,
					...(opts.component !== undefined
						? { component: opts.component }
						: {}),
					...(opts.wrapper !== undefined ? { wrapper: opts.wrapper } : {}),
					...(opts.props !== undefined ? { props: opts.props } : {}),
				}),
			);
		},

		discriminatedUnion(opts: {
			id: string;
			label?: string;
			discriminant: string;
			variants: readonly TypedObjectNode<string, unknown>[];
		}): TypedUnionNode<string, unknown> {
			return mark(
				coreS.discriminatedUnion({
					id: opts.id,
					...(opts.label !== undefined ? { label: opts.label } : {}),
					discriminant: opts.discriminant,
					variants: opts.variants as readonly ObjectNode[],
				}),
			) as TypedUnionNode<string, unknown>;
		},

		tabs<const Tabs extends readonly TypedTabNode<readonly TypedTreeNode[]>[]>(
			content: Tabs,
		): TypedTabsNode<Tabs> {
			return coreS.tabs(
				content as unknown as readonly TabNode[],
			) as unknown as TypedTabsNode<Tabs>;
		},
		tab<const Content extends readonly TypedTreeNode[]>(opts: {
			id: string;
			label: string;
			icon?: string;
			content: Content;
		}): TypedTabNode<Content> {
			return coreS.tab({
				id: opts.id,
				label: opts.label,
				...(opts.icon !== undefined ? { icon: opts.icon } : {}),
				content: opts.content as readonly TreeNode[],
			}) as unknown as TypedTabNode<Content>;
		},
		stack<const Content extends readonly TypedTreeNode[]>(
			content: Content,
		): TypedStackNode<Content> {
			return coreS.stack(
				content as readonly TreeNode[],
			) as unknown as TypedStackNode<Content>;
		},
		columns<
			const Cols extends readonly TypedColumnNode<readonly TypedTreeNode[]>[],
		>(content: Cols): TypedColumnsNode<Cols> {
			return coreS.columns(
				content as unknown as readonly ColumnNode[],
			) as unknown as TypedColumnsNode<Cols>;
		},
		column<const Content extends readonly TypedTreeNode[]>(opts: {
			id: string;
			width?: number;
			content: Content;
		}): TypedColumnNode<Content> {
			return coreS.column({
				id: opts.id,
				...(opts.width !== undefined ? { width: opts.width } : {}),
				content: opts.content as readonly TreeNode[],
			}) as unknown as TypedColumnNode<Content>;
		},
		group<const Content extends readonly TypedTreeNode[]>(opts: {
			id?: string;
			label?: string;
			content: Content;
		}): TypedGroupNode<Content> {
			return coreS.group({
				...(opts.id !== undefined ? { id: opts.id } : {}),
				...(opts.label !== undefined ? { label: opts.label } : {}),
				content: opts.content as readonly TreeNode[],
			}) as unknown as TypedGroupNode<Content>;
		},
		header(opts: { label: string }): HeaderNode {
			return coreS.header(opts);
		},
		separator(): SeparatorNode {
			return coreS.separator();
		},
		glob(opts: { base: string; pattern: string }): GlobLoaderNode {
			return coreS.glob(opts);
		},
		collection(opts: {
			loader: GlobLoaderNode;
			schema: TypedTreeNode;
		}): CollectionNode {
			return coreS.collection({
				loader: opts.loader,
				schema: opts.schema as TreeNode,
			});
		},
	};

	return builders as CmsBuilders<Collections, Components>;
}
