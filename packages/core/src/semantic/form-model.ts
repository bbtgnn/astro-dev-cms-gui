/**
 * Serializable browser form / layout model types (schema-first projection).
 * Built by {@link projectSchemaFormModel} / {@link projectSchemaFormModels};
 * lowered by `@cms/authoring` into EditorCollections.
 */

import type { OpaqueBinding, OpaqueProps, SemanticKind } from "./types";

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
	readonly referenceCollection?: string;
	/** Opaque editor override token (host resolves via Vite). */
	readonly component?: OpaqueBinding;
	/** Opaque wrapper token (objects/arrays). */
	readonly wrapper?: OpaqueBinding;
	readonly props?: OpaqueProps;
};

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
	readonly fields: Readonly<Record<string, FormFieldDescriptor>>;
	/**
	 * Portable JSON Schema for client structural validation (persisted input).
	 * Derived from stamped Zod / Standard Schema Input.
	 */
	readonly jsonSchema: Record<string, unknown>;
};

export type FormModelsByCollection = Readonly<
	Record<string, CollectionFormModel>
>;
