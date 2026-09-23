/**
 * Form tree builders — presentation-only authoring tree for one collection.
 *
 * A **field ref** is a typed reference to a key in a collection’s persisted Input
 * shape (`Data`), used for placement and chrome (label, editor catalog key, kind
 * hints). It is **not** a Field schema / IR `s.field` node and does not declare
 * persisted shape; Zod / content.config remain validation authority.
 *
 * Layout nodes (`tabs`, `columns`, `group`) arrange field refs without changing
 * the key space. Entering a nested object rebinds helpers via `.fields` / `.form`
 * callback scopes. Ticket 13 lowers this tree into the serializable form model.
 *
 * No live Svelte values; editor bindings are opaque catalog keys (`OpaqueBinding`).
 */

import type { OpaqueBinding, SemanticKind } from "./semantic/types";

/** Kind hints on a field ref — same vocabulary as path-map chrome (`image` / `reference`). */
export type FormTreeKindHint = Extract<SemanticKind, "image" | "reference">;

/** Presentation chrome on a field ref (fluent `.label` / `.editor` / `.kind`). */
export type FormTreeFieldChrome = {
	readonly label?: string;
	readonly editor?: OpaqueBinding;
	readonly kind?: FormTreeKindHint;
};

export type FormTreeFieldNode = {
	readonly type: "field";
	readonly key: string;
	readonly chrome?: FormTreeFieldChrome;
	/** Nested presentation when the ref points at an object Input. */
	readonly content?: readonly FormTreeNode[];
};

export type FormTreeTabEntry = {
	readonly id: string;
	readonly label?: string;
	readonly content: readonly FormTreeNode[];
};

export type FormTreeTabsNode = {
	readonly type: "tabs";
	readonly content: readonly FormTreeTabEntry[];
};

export type FormTreeColumnsNode = {
	readonly type: "columns";
	/** Each column is a plain array of children — no singular `column()` wrapper. */
	readonly content: readonly (readonly FormTreeNode[])[];
};

export type FormTreeGroupNode = {
	readonly type: "group";
	readonly label?: string;
	readonly content: readonly FormTreeNode[];
};

export type FormTreeNode =
	| FormTreeFieldNode
	| FormTreeTabsNode
	| FormTreeColumnsNode
	| FormTreeGroupNode;

/** A form tree is an ordered list of layout / field-ref nodes (default outer stack). */
export type FormTree = readonly FormTreeNode[];

type PlainObject = Record<string, unknown>;

/** Object Input shape for nested scopes (arrays / functions are not enterable). */
export type ObjectInputOf<T> = NonNullable<T> extends readonly unknown[]
	? never
	: NonNullable<T> extends PlainObject
		? NonNullable<T>
		: never;

type FieldChromeState = FormTreeFieldChrome & {
	readonly content?: readonly FormTreeNode[];
};

const FIELD_CHROME = Symbol.for("@cms/core/form-tree.fieldChrome");

type FieldRefInternal = FormTreeFieldNode & {
	readonly [FIELD_CHROME]: FieldChromeState;
};

export type FieldFn<Data> = <K extends keyof Data & string>(
	key: K,
) => FieldRefBuilder<Data, K>;

export type FormTreeHelpers<Data> = {
	readonly field: FieldFn<Data>;
	readonly tabs: (entries: readonly FormTreeTabEntry[]) => FormTreeTabsNode;
	readonly columns: (
		cols: readonly (readonly FormTreeNode[])[],
	) => FormTreeColumnsNode;
	readonly group: (opts: {
		readonly label?: string;
		readonly content: readonly FormTreeNode[];
	}) => FormTreeGroupNode;
};

/**
 * Scoped helpers for `.form((f) => …)`: callable as `f(key)` plus layout methods.
 * Layout does not rebind the key space — only object enter does.
 */
export type ScopedFormTreeHelpers<Data> = FormTreeHelpers<Data> & FieldFn<Data>;

type ObjectFieldMethods<Data, K extends keyof Data & string> =
	[ObjectInputOf<Data[K]>] extends [never]
		? unknown
		: {
				fields(
					build: (f: FieldFn<ObjectInputOf<Data[K]>>) => readonly FormTreeNode[],
				): FieldRefBuilder<Data, K>;
				form(
					build: (
						f: ScopedFormTreeHelpers<ObjectInputOf<Data[K]>>,
					) => FormTreeNode | readonly FormTreeNode[],
				): FieldRefBuilder<Data, K>;
			};

export type FieldRefBuilder<
	Data,
	K extends keyof Data & string,
> = FormTreeFieldNode & {
	readonly key: K;
	label(label: string): FieldRefBuilder<Data, K>;
	editor(editor: OpaqueBinding): FieldRefBuilder<Data, K>;
	kind(kind: FormTreeKindHint): FieldRefBuilder<Data, K>;
} & ObjectFieldMethods<Data, K>;

function normalizeContent(
	value: FormTreeNode | readonly FormTreeNode[],
): readonly FormTreeNode[] {
	return Array.isArray(value)
		? (value as readonly FormTreeNode[])
		: [value as FormTreeNode];
}

type FieldRefProto = {
	label(this: FieldRefInternal, label: string): FormTreeFieldNode;
	editor(this: FieldRefInternal, editor: OpaqueBinding): FormTreeFieldNode;
	kind(this: FieldRefInternal, kind: FormTreeKindHint): FormTreeFieldNode;
	fields(
		this: FieldRefInternal,
		build: (f: FieldFn<never>) => readonly FormTreeNode[],
	): FormTreeFieldNode;
	form(
		this: FieldRefInternal,
		build: (
			f: ScopedFormTreeHelpers<never>,
		) => FormTreeNode | readonly FormTreeNode[],
	): FormTreeFieldNode;
};

const fieldRefProto: FieldRefProto = {
	label(label: string) {
		return createFieldRefNode(this.key, { ...this[FIELD_CHROME], label });
	},
	editor(editor: OpaqueBinding) {
		return createFieldRefNode(this.key, { ...this[FIELD_CHROME], editor });
	},
	kind(kind: FormTreeKindHint) {
		return createFieldRefNode(this.key, { ...this[FIELD_CHROME], kind });
	},
	fields(build) {
		const nested = createFormTreeHelpers<Record<string, unknown>>();
		return createFieldRefNode(this.key, {
			...this[FIELD_CHROME],
			content: build(nested.field as FieldFn<never>),
		});
	},
	form(build) {
		const nested = createScopedFormTreeHelpers<Record<string, unknown>>();
		return createFieldRefNode(this.key, {
			...this[FIELD_CHROME],
			content: normalizeContent(
				build(nested as ScopedFormTreeHelpers<never>),
			),
		});
	},
};

function fieldChromeFromState(
	state: FieldChromeState,
): FormTreeFieldChrome | undefined {
	const chrome: FormTreeFieldChrome = {
		...(state.label !== undefined ? { label: state.label } : {}),
		...(state.editor !== undefined ? { editor: state.editor } : {}),
		...(state.kind !== undefined ? { kind: state.kind } : {}),
	};
	return Object.keys(chrome).length > 0 ? chrome : undefined;
}

/** Runtime field-ref node; public `field()` re-applies the `Data` / key generics. */
function createFieldRefNode(
	key: string,
	state: FieldChromeState = {},
): FieldRefInternal {
	const node = Object.create(fieldRefProto) as FieldRefInternal;
	Object.defineProperty(node, FIELD_CHROME, {
		value: state,
		enumerable: false,
	});
	const chrome = fieldChromeFromState(state);
	Object.assign(node, {
		type: "field" as const,
		key,
		...(chrome !== undefined ? { chrome } : {}),
		...(state.content !== undefined ? { content: state.content } : {}),
	});
	return node;
}

/**
 * Scoped helpers for collection-level `form: (f) => …` callbacks:
 * callable as `f(key)` plus `field` / `tabs` / `columns` / `group`.
 */
export function createScopedFormTreeHelpers<Data>(): ScopedFormTreeHelpers<Data> {
	const helpers = createFormTreeHelpers<Data>();
	const call = ((key: keyof Data & string) =>
		helpers.field(key)) as ScopedFormTreeHelpers<Data>;
	return Object.assign(call, helpers);
}

/**
 * Factory for form-tree helpers typed against a collection Input shape `Data`.
 * Prefer this over repeating `field<Data>(…)` at every call site.
 */
export function createFormTreeHelpers<Data>(): FormTreeHelpers<Data> {
	return {
		field<K extends keyof Data & string>(key: K): FieldRefBuilder<Data, K> {
			return createFieldRefNode(key) as unknown as FieldRefBuilder<Data, K>;
		},
		tabs(entries: readonly FormTreeTabEntry[]): FormTreeTabsNode {
			return {
				type: "tabs",
				content: entries.map((entry) => ({
					id: entry.id,
					...(entry.label !== undefined ? { label: entry.label } : {}),
					content: entry.content,
				})),
			};
		},
		columns(
			cols: readonly (readonly FormTreeNode[])[],
		): FormTreeColumnsNode {
			return {
				type: "columns",
				content: cols.map((col) => [...col]),
			};
		},
		group(opts: {
			readonly label?: string;
			readonly content: readonly FormTreeNode[];
		}): FormTreeGroupNode {
			return {
				type: "group",
				...(opts.label !== undefined ? { label: opts.label } : {}),
				content: opts.content,
			};
		},
	};
}
