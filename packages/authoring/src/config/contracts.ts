/**
 * Svelte editor / wrapper / icon contracts for the CMS-first unified tree
 * (ADR-0019). Shell-owned props are provided by the form shell; editor-specific
 * keys go in the explicit `props` bag.
 */

import type { SemanticKind } from "@cms/core/semantic";
import type { Component, ComponentProps } from "svelte";

/** Semantic kinds that participate in field / aggregate editor contracts. */
export type FieldKind = SemanticKind;

/**
 * Open Svelte component bound — props variance requires `any` here so concrete
 * editors remain assignable into shell-checked slots.
 */
// biome-ignore lint/suspicious/noExplicitAny: Svelte Component props variance
export type AnySvelteComponent = Component<any>;

export type FieldError = {
	readonly message: string;
};

const fieldKindBrand: unique symbol = Symbol("cms.fieldKind");

/**
 * Authoring-facing field control. The brand keeps string-persisted kinds
 * (text / image path / reference id) from collapsing into each other.
 */
export type FieldControl<Input, Kind extends FieldKind> = {
	readonly value: Input;
	readonly errors: readonly FieldError[];
	readonly disabled: boolean;
	set(value: Input): void;
	readonly [fieldKindBrand]: (kind: Kind) => Kind;
};

/** Build a branded field control for the form shell / SJSF bridge. */
export function createFieldControl<Input, Kind extends FieldKind>(args: {
	readonly getValue: () => Input;
	readonly setValue: (value: Input) => void;
	readonly getErrors: () => readonly FieldError[];
	readonly getDisabled: () => boolean;
}): FieldControl<Input, Kind> {
	return {
		get value() {
			return args.getValue();
		},
		get errors() {
			return args.getErrors();
		},
		get disabled() {
			return args.getDisabled();
		},
		set(value: Input) {
			args.setValue(value);
		},
		[fieldKindBrand]: (kind) => kind,
	};
}

/** Props the form shell always supplies to a field / aggregate editor. */
export type FieldEditorProps<Input, Kind extends FieldKind> = {
	field: FieldControl<Input, Kind>;
	label: string;
	description?: string;
};

/**
 * Chrome-only aggregate wrapper: children still render; the wrapper does not
 * own the persisted value.
 */
export type AggregateWrapperProps = {
	label?: string;
	description?: string;
	errors: readonly FieldError[];
	disabled?: boolean;
	children: unknown;
};

/** Keys owned by the form shell — never placed in the author `props` bag. */
export type ShellOwnedKey =
	| "field"
	| "label"
	| "description"
	| "errors"
	| "disabled"
	| "children";

export const SHELL_OWNED_KEYS = [
	"field",
	"label",
	"description",
	"errors",
	"disabled",
	"children",
] as const satisfies readonly ShellOwnedKey[];

/** Editor-specific props: component props minus shell-owned keys. */
export type EditorExtraProps<C extends AnySvelteComponent> = Omit<
	ComponentProps<C>,
	ShellOwnedKey
>;

type RequiredKeys<T> = {
	// biome-ignore lint/complexity/noBannedTypes: standard required-key detection
	[K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Rest args after a catalog key on `.editor()` / `.wrapper()`: props are
 * required only when the component has required extra keys.
 */
export type EditorPropsArg<C extends AnySvelteComponent> = [
	RequiredKeys<EditorExtraProps<C>>,
] extends [never]
	? [props?: EditorExtraProps<C>]
	: [props: EditorExtraProps<C>];

/**
 * True when the shell can satisfy the component's shell-owned props for the
 * inferred Input/Kind (wrong value shape or kind fails this check).
 */
export type ShellCompatibleEditor<
	C extends AnySvelteComponent,
	Input,
	Kind extends FieldKind,
> =
	FieldEditorProps<Input, Kind> extends Pick<
		ComponentProps<C>,
		Extract<keyof ComponentProps<C>, ShellOwnedKey>
	>
		? C
		: never;

export type ShellCompatibleWrapper<C extends AnySvelteComponent> =
	AggregateWrapperProps extends Pick<
		ComponentProps<C>,
		Extract<keyof ComponentProps<C>, ShellOwnedKey>
	>
		? C
		: never;

/** Optional tab / chrome icon — no required props. */
export type FieldIcon = Component<Record<string, never> | { class?: string }>;

/**
 * Catalog of live Svelte editors / wrappers / icons (Vite-only module).
 * Keys are authored in `cms.config.ts`; values resolve in the host graph.
 */
export type ComponentsCatalog = Record<string, AnySvelteComponent>;

/** Default when the host uses only stock editors (no custom catalog). */
export type EmptyComponents = Record<never, AnySvelteComponent>;

/**
 * Catalog keys whose component is shell-compatible for the field's Input/Kind.
 * Wrong shape or kind yields `never` (type error on `.editor(…)`).
 */
export type CompatibleKey<
	Components extends ComponentsCatalog,
	Input,
	Kind extends FieldKind,
> = {
	[K in keyof Components & string]: Components[K] extends ShellCompatibleEditor<
		Components[K],
		Input,
		Kind
	>
		? K
		: never;
}[keyof Components & string];

/** Catalog keys usable as aggregate `wrapper` (chrome only). */
export type CompatibleWrapperKey<Components extends ComponentsCatalog> = {
	[K in keyof Components & string]: Components[K] extends ShellCompatibleWrapper<
		Components[K]
	>
		? K
		: never;
}[keyof Components & string];

/** Catalog keys usable as tab / chrome `icon`. */
export type CompatibleIconKey<Components extends ComponentsCatalog> = {
	[K in keyof Components & string]: Components[K] extends FieldIcon ? K : never;
}[keyof Components & string];
