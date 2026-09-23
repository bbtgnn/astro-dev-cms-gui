/**
 * Closed semantic IR types (ADR-0019).
 * No Svelte — editor bindings are opaque tokens only.
 */

/** Opaque editor / chrome binding (component, wrapper, icon). Never Svelte-typed here. */
export type OpaqueBinding = unknown;

/** Editor-specific props bag — opaque at IR; no Svelte ComponentProps. */
export type OpaqueProps = Readonly<Record<string, unknown>>;

/** Stock editor kind encoded on durable IR nodes. */
export type SemanticKind =
	| "string"
	| "number"
	| "boolean"
	| "literal"
	| "enum"
	| "object"
	| "array"
	| "discriminatedUnion"
	| "image"
	| "reference";

/** v1 closed string constraints. */
export type StringConstraint =
	| { readonly method: "min"; readonly value: number }
	| { readonly method: "max"; readonly value: number }
	| {
			readonly method: "regex";
			readonly source: string;
			readonly flags: string;
	  };

/** v1 closed number constraints. */
export type NumberConstraint =
	| { readonly method: "min"; readonly value: number }
	| { readonly method: "max"; readonly value: number }
	| { readonly method: "int" };

export type ScalarConstraint = StringConstraint | NumberConstraint;

// ---------------------------------------------------------------------------
// Compiled IR (output of compileSemanticIr)
// ---------------------------------------------------------------------------

export type IrString = {
	readonly kind: "string";
	readonly constraints: readonly StringConstraint[];
};

export type IrNumber = {
	readonly kind: "number";
	readonly constraints: readonly NumberConstraint[];
};

export type IrBoolean = {
	readonly kind: "boolean";
};

export type IrLiteral = {
	readonly kind: "literal";
	readonly value: string | number | boolean;
};

export type IrEnum = {
	readonly kind: "enum";
	readonly values: readonly [string, ...string[]];
};

export type IrImage = {
	readonly kind: "image";
};

export type IrReference = {
	readonly kind: "reference";
	readonly collection: string;
};

export type IrOptional = {
	readonly kind: "optional";
	readonly of: IrSchema;
};

export type IrNullable = {
	readonly kind: "nullable";
	readonly of: IrSchema;
};

export type IrDefault = {
	readonly kind: "default";
	readonly of: IrSchema;
	readonly value: unknown;
};

export type IrSchema =
	| IrString
	| IrNumber
	| IrBoolean
	| IrLiteral
	| IrEnum
	| IrImage
	| IrReference
	| IrOptional
	| IrNullable
	| IrDefault
	| IrObject
	| IrArray
	| IrDiscriminatedUnion;

export type IrField = {
	readonly kind: "field";
	readonly id: string;
	readonly label?: string;
	readonly schema: IrSchema;
	readonly semanticKind: SemanticKind;
	readonly component?: OpaqueBinding;
	readonly props?: OpaqueProps;
};

export type IrObject = {
	readonly kind: "object";
	readonly id: string;
	readonly label?: string;
	readonly content: readonly IrTreeNode[];
	readonly semanticKind: "object";
	readonly component?: OpaqueBinding;
	readonly wrapper?: OpaqueBinding;
	readonly props?: OpaqueProps;
};

export type IrArray = {
	readonly kind: "array";
	readonly id: string;
	readonly label?: string;
	readonly of: IrSchema;
	readonly semanticKind: "array";
	readonly component?: OpaqueBinding;
	readonly wrapper?: OpaqueBinding;
	readonly props?: OpaqueProps;
};

export type IrDiscriminatedUnion = {
	readonly kind: "discriminatedUnion";
	readonly id: string;
	readonly label?: string;
	readonly discriminant: string;
	readonly variants: readonly IrObject[];
	readonly semanticKind: "discriminatedUnion";
};

export type IrTab = {
	readonly kind: "tab";
	readonly id: string;
	readonly label: string;
	readonly icon?: OpaqueBinding;
	readonly content: readonly IrTreeNode[];
};

export type IrTabs = {
	readonly kind: "tabs";
	readonly content: readonly IrTab[];
};

export type IrStack = {
	readonly kind: "stack";
	readonly content: readonly IrTreeNode[];
};

export type IrColumn = {
	readonly kind: "column";
	readonly id: string;
	readonly width: number;
	readonly content: readonly IrTreeNode[];
};

export type IrColumns = {
	readonly kind: "columns";
	readonly content: readonly IrColumn[];
};

export type IrGroup = {
	readonly kind: "group";
	readonly id?: string;
	readonly label?: string;
	readonly content: readonly IrTreeNode[];
};

export type IrHeader = {
	readonly kind: "header";
	readonly label: string;
};

export type IrSeparator = {
	readonly kind: "separator";
};

/** Any node that may appear in a collection schema tree. */
export type IrTreeNode =
	| IrField
	| IrObject
	| IrArray
	| IrDiscriminatedUnion
	| IrTabs
	| IrTab
	| IrStack
	| IrColumns
	| IrColumn
	| IrGroup
	| IrHeader
	| IrSeparator;

export type IrGlobLoader = {
	readonly kind: "glob";
	readonly base: string;
	readonly pattern: string;
};

export type IrCollection = {
	readonly id: string;
	readonly loader: IrGlobLoader;
	/** Full authoring tree (includes presentation). */
	readonly schema: IrTreeNode;
};

/**
 * Public compiled IR face — collection trees only.
 * The presentation-stripped persisted partition is package-internal
 * (`CompiledSemanticIrInternal`); cross-package callers use product seams
 * (`persistedProjections`, form model, validator, emit).
 */
export type CompiledSemanticIr = {
	readonly collections: Readonly<Record<string, IrCollection>>;
};

/**
 * Internal compile output: public IR plus persisted partition.
 * Not re-exported from `@cms/core/semantic`.
 */
export type CompiledSemanticIrInternal = CompiledSemanticIr & {
	readonly persisted: PersistedConfigShape;
};

// ---------------------------------------------------------------------------
// Persisted shape (presentation stripped) — package-internal format
// ---------------------------------------------------------------------------

export type PersistedSchema =
	| IrString
	| IrNumber
	| IrBoolean
	| IrLiteral
	| IrEnum
	| IrImage
	| IrReference
	| PersistedOptional
	| PersistedNullable
	| PersistedDefault
	| PersistedObject
	| PersistedArray
	| PersistedDiscriminatedUnion;

export type PersistedOptional = {
	readonly kind: "optional";
	readonly of: PersistedSchema;
};

export type PersistedNullable = {
	readonly kind: "nullable";
	readonly of: PersistedSchema;
};

export type PersistedDefault = {
	readonly kind: "default";
	readonly of: PersistedSchema;
	readonly value: unknown;
};

export type PersistedField = {
	readonly id: string;
	readonly label?: string;
	readonly schema: PersistedSchema;
	readonly semanticKind: SemanticKind;
};

export type PersistedObject = {
	readonly kind: "object";
	readonly fields: readonly PersistedField[];
};

export type PersistedArray = {
	readonly kind: "array";
	readonly of: PersistedSchema;
};

export type PersistedDiscriminatedUnion = {
	readonly kind: "discriminatedUnion";
	readonly discriminant: string;
	readonly variants: readonly {
		readonly id: string;
		readonly label?: string;
		readonly fields: readonly PersistedField[];
	}[];
};

export type PersistedCollectionShape = {
	readonly loader: IrGlobLoader;
	/** Root object fields collected from the schema tree. */
	readonly fields: readonly PersistedField[];
};

export type PersistedConfigShape = Readonly<
	Record<string, PersistedCollectionShape>
>;
