/**
 * Typed CMS schema builders: core `s` at runtime + catalog key contracts at
 * the type level (ADR-0018 / 0019). Opaque bindings are string keys into a
 * Vite-only components catalog — generation stays Svelte-free.
 *
 * Runtime algebra lives in `@cms/core/semantic` (`s`). This module is the
 * catalog/`ShapeOfContent` type layer: `createCmsBuilders` is a typed alias.
 */

import {
	type BooleanNode,
	type CollectionNode,
	s as coreS,
	type GlobLoaderNode,
	type HeaderNode,
	type ImageNode,
	type NumberNode,
	type ReferenceNode,
	type SeparatorNode,
	type StringNode,
} from "@cms/core/semantic";
import type {
	CompatibleIconKey,
	CompatibleKey,
	CompatibleWrapperKey,
	ComponentsCatalog,
	EditorPropsArg,
	EmptyComponents,
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
	}): BindableField<Id, InputOfSchema<S>, KindOfSchema<S>, Components>;

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
 * Runtime is core `s`; this returns it branded with catalog typing.
 */
export function createCmsBuilders<
	Collections extends string = string,
	Components extends ComponentsCatalog = EmptyComponents,
>(): CmsBuilders<Collections, Components> {
	return coreS as unknown as CmsBuilders<Collections, Components>;
}
