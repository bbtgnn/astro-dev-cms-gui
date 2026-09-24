/**
 * Shared semantic kinds, opaque bindings, and constraint shapes.
 * Used by schema→form projection and authoring field contracts.
 * No CMS-first IR node types on this exploration branch.
 */

/** Opaque editor / chrome binding (component, wrapper, icon). Never Svelte-typed here. */
export type OpaqueBinding = unknown;

/** Editor-specific props bag — opaque at the form-model boundary; no Svelte ComponentProps. */
export type OpaqueProps = Readonly<Record<string, unknown>>;

/** Stock editor kind encoded on form-field descriptors. */
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
