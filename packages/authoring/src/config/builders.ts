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
	EditorPropsArg,
	FieldKind,
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

/** Stock field / aggregate before catalog binding via `.editor()` / `.wrapper()`. */
type BindableField<
	Id extends string,
	Input,
	Kind extends FieldKind,
	Components extends ComponentsCatalog,
> = TypedFieldNode<Id, Input, Kind> & {
	editor<const K extends CompatibleKey<Components, Input, Kind>>(
		key: K,
		...propsArg: EditorPropsArg<Components[K]>
	): TypedFieldNode<Id, Input, Kind>;
};

type BindableObject<
	Id extends string,
	Input,
	Components extends ComponentsCatalog,
> = TypedObjectNode<Id, Input> & {
	editor<const K extends CompatibleKey<Components, Input, "object">>(
		key: K,
		...propsArg: EditorPropsArg<Components[K]>
	): TypedObjectNode<Id, Input>;
	wrapper<const W extends CompatibleWrapperKey<Components>>(
		key: W,
		...propsArg: EditorPropsArg<Components[W]>
	): TypedObjectNode<Id, Input>;
};

type BindableArray<
	Id extends string,
	Input,
	Components extends ComponentsCatalog,
> = TypedArrayNode<Id, Input> & {
	editor<const K extends CompatibleKey<Components, Input, "array">>(
		key: K,
		...propsArg: EditorPropsArg<Components[K]>
	): TypedArrayNode<Id, Input>;
	wrapper<const W extends CompatibleWrapperKey<Components>>(
		key: W,
		...propsArg: EditorPropsArg<Components[W]>
	): TypedArrayNode<Id, Input>;
};

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

	field<const Id extends string, S extends AnyTypedSchema>(opts: {
		id: Id;
		label?: string;
		schema: S;
	}): BindableField<
		Id,
		InputOfSchema<S>,
		KindOfSchema<S>,
		Components
	>;

	object<
		const Id extends string,
		const Content extends readonly TypedTreeNode[],
	>(opts: {
		id: Id;
		label?: string;
		content: Content;
	}): BindableObject<Id, ShapeOfContent<Content>, Components>;

	array<const Id extends string, S extends AnyTypedSchema>(opts: {
		id: Id;
		label?: string;
		of: S;
	}): BindableArray<Id, InputOfSchema<S>[], Components>;

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
		}): BindableField<string, unknown, FieldKind, Components> {
			const node = coreS.field({
				id: opts.id,
				...(opts.label !== undefined ? { label: opts.label } : {}),
				schema: opts.schema as SchemaNode,
			});
			return Object.assign({}, mark(node), {
				editor(key: string, props?: Record<string, unknown>) {
					return mark(
						coreS.field({
							id: opts.id,
							...(opts.label !== undefined ? { label: opts.label } : {}),
							schema: opts.schema as SchemaNode,
							component: key,
							...(props !== undefined ? { props } : {}),
						}),
					);
				},
			}) as BindableField<string, unknown, FieldKind, Components>;
		},

		object(opts: {
			id: string;
			label?: string;
			content: readonly TypedTreeNode[];
		}): BindableObject<string, unknown, Components> {
			const node = coreS.object({
				id: opts.id,
				...(opts.label !== undefined ? { label: opts.label } : {}),
				content: opts.content as readonly TreeNode[],
			});
			return Object.assign({}, mark(node), {
				editor(key: string, props?: Record<string, unknown>) {
					return mark(
						coreS.object({
							id: opts.id,
							...(opts.label !== undefined ? { label: opts.label } : {}),
							content: opts.content as readonly TreeNode[],
							component: key,
							...(props !== undefined ? { props } : {}),
						}),
					) as TypedObjectNode<string, unknown>;
				},
				wrapper(key: string, props?: Record<string, unknown>) {
					return mark(
						coreS.object({
							id: opts.id,
							...(opts.label !== undefined ? { label: opts.label } : {}),
							content: opts.content as readonly TreeNode[],
							wrapper: key,
							...(props !== undefined ? { props } : {}),
						}),
					) as TypedObjectNode<string, unknown>;
				},
			}) as BindableObject<string, unknown, Components>;
		},

		array(opts: {
			id: string;
			label?: string;
			of: AnyTypedSchema;
		}): BindableArray<string, unknown[], Components> {
			const node = coreS.array({
				id: opts.id,
				...(opts.label !== undefined ? { label: opts.label } : {}),
				of: opts.of as SchemaNode,
			});
			return Object.assign({}, mark(node), {
				editor(key: string, props?: Record<string, unknown>) {
					return mark(
						coreS.array({
							id: opts.id,
							...(opts.label !== undefined ? { label: opts.label } : {}),
							of: opts.of as SchemaNode,
							component: key,
							...(props !== undefined ? { props } : {}),
						}),
					);
				},
				wrapper(key: string, props?: Record<string, unknown>) {
					return mark(
						coreS.array({
							id: opts.id,
							...(opts.label !== undefined ? { label: opts.label } : {}),
							of: opts.of as SchemaNode,
							wrapper: key,
							...(props !== undefined ? { props } : {}),
						}),
					);
				},
			}) as BindableArray<string, unknown[], Components>;
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
