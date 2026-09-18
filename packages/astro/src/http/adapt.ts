/**
 * Astro → FieldUi bridges. Keep `@cms/core` Astro-free: hosts wrap
 * `reference()` / `image()` Zod from Astro and attach CMS UI meta here.
 *
 * Astro's `astro:content` helpers are built on `astro/zod` (Zod 3 API without
 * `.meta()`). When the passed schema cannot take FieldUi via `.meta()`, we
 * fall back to portable `@cms/core` builders so content.config stays one
 * editable Zod tree.
 */
import {
	type FieldUiOptions,
	fieldUiFromOptions,
	image as imageField,
	reference as referenceField,
	withFieldUi,
	type z,
} from "@cms/core";

export type AdaptReferenceOptions = FieldUiOptions & {
	/** Target collection id — shown in FieldUi options / label hint. */
	collection: string;
};

export type AdaptImageOptions = FieldUiOptions;

function canAttachFieldUi(schema: unknown): schema is z.ZodType {
	return (
		typeof schema === "object" &&
		schema !== null &&
		typeof (schema as { meta?: unknown }).meta === "function"
	);
}

/**
 * Wrap Astro `reference(collection)` Zod with the reference FieldUi.
 * UI is minimum text + collection hint; select-over-ids is later.
 */
export function adaptReference(
	schema: unknown,
	opts: AdaptReferenceOptions,
): z.ZodType {
	const { collection, label, options } = opts;
	const hintLabel = label ?? `Reference (${collection})`;
	const ui = fieldUiFromOptions("reference", {
		label: hintLabel,
		options: { collection, ...options },
	});

	if (canAttachFieldUi(schema)) {
		return withFieldUi(schema, ui);
	}

	// Astro reference() Zod lacks `.meta()` — portable string + FieldUi.
	return referenceField(collection, {
		label: hintLabel,
		options,
	});
}

/**
 * Wrap Astro `image()` / SchemaContext `image()` Zod with the image FieldUi stub.
 * Rich wasm/srcset UI is an open thread — no sample image fields in P5.
 */
export function adaptImage(
	schema: unknown,
	opts?: AdaptImageOptions,
): z.ZodType {
	const ui = fieldUiFromOptions("image", opts);

	if (canAttachFieldUi(schema)) {
		return withFieldUi(schema, ui);
	}

	return imageField(opts);
}
