/**
 * Stock editor registry by semantic kind (ADR-0019).
 * Field-level opaque `component` overrides win when present on the form model.
 * Live Svelte resolution stays on the host Vite seam — core stays Svelte-free.
 *
 * Stock editors are FieldEditorProps components; the form theme bridges them to
 * SJSF widget slots. `sjsfWidget` / `componentKey` remain lowering tokens only.
 */

import type {
	FormFieldDescriptor,
	OpaqueBinding,
	SemanticKind,
} from "@cms/core/semantic";

/** Default stock editor identity for a semantic kind. */
export type StockEditorEntry = {
	readonly kind: SemanticKind;
	/** Foundational sjsf widget key when applicable. */
	readonly sjsfWidget?: string;
	/**
	 * Theme / registry component key (e.g. `imageField`), or a stub marker.
	 * Not a live Svelte value — hosts map keys through the Vite theme.
	 */
	readonly componentKey?: string;
	readonly stub?: boolean;
};

export type StockEditorRegistry = Readonly<
	Record<SemanticKind, StockEditorEntry>
>;

/** Built-in stock map: semantic kind → default editor. */
export const stockEditorRegistry: StockEditorRegistry = {
	string: { kind: "string", sjsfWidget: "textWidget" },
	number: { kind: "number", sjsfWidget: "numberWidget" },
	boolean: { kind: "boolean", sjsfWidget: "checkboxWidget" },
	literal: {
		kind: "literal",
		sjsfWidget: "textWidget",
		componentKey: "literalField",
		stub: true,
	},
	enum: { kind: "enum", sjsfWidget: "selectWidget" },
	object: { kind: "object" },
	array: { kind: "array" },
	discriminatedUnion: {
		kind: "discriminatedUnion",
		sjsfWidget: "selectWidget",
		componentKey: "discriminatedUnionField",
		stub: true,
	},
	image: {
		kind: "image",
		sjsfWidget: "textWidget",
		componentKey: "imageField",
	},
	reference: {
		kind: "reference",
		sjsfWidget: "textWidget",
		componentKey: "referenceField",
		stub: true,
	},
};

export function getStockEditor(
	kind: SemanticKind,
	registry: StockEditorRegistry = stockEditorRegistry,
): StockEditorEntry {
	return registry[kind];
}

/**
 * Resolve a live binding token through the host Vite graph.
 * Default identity — hosts pass a map/lookup from opaque IR tokens.
 */
export type LiveBindingResolver = (token: OpaqueBinding) => unknown;

export type ResolvedFieldEditor =
	| {
			readonly source: "override";
			readonly component: unknown;
			readonly props?: FormFieldDescriptor["props"];
	  }
	| {
			readonly source: "stock";
			readonly entry: StockEditorEntry;
			readonly props?: FormFieldDescriptor["props"];
	  };

/**
 * Choose the editor for a field descriptor.
 * Opaque `component` on the IR/form model wins over stock-by-kind.
 */
export function resolveFieldEditor(
	field: FormFieldDescriptor,
	options?: {
		readonly resolveBinding?: LiveBindingResolver;
		readonly registry?: StockEditorRegistry;
	},
): ResolvedFieldEditor {
	if (field.component !== undefined) {
		const resolve =
			options?.resolveBinding ?? ((token: OpaqueBinding) => token);
		return {
			source: "override",
			component: resolve(field.component),
			...(field.props !== undefined ? { props: field.props } : {}),
		};
	}
	return {
		source: "stock",
		entry: getStockEditor(field.semanticKind, options?.registry),
		...(field.props !== undefined ? { props: field.props } : {}),
	};
}
