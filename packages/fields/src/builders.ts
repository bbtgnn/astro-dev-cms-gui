import { z } from "zod";
import { fieldUiFromOptions, isFieldUi, withFieldUi } from "./meta";
import type {
	BlockDefinition,
	BlocksLayoutOptions,
	FieldMeta,
	FieldUi,
	FieldUiOptions,
	I18nOptions,
} from "./types";

type Shape = Record<string, z.ZodType>;

function attach<T extends z.ZodType>(
	schema: T,
	widget: string,
	opts?: FieldUiOptions,
): T {
	return withFieldUi(schema, fieldUiFromOptions(widget, opts));
}

/** Escape hatch — attach FieldUi or a direct `ui` Component override. */
export function field<T extends z.ZodType>(
	schema: T,
	ui: FieldUi | FieldMeta | unknown,
): T {
	if (isFieldUi(ui)) {
		return withFieldUi(schema, ui);
	}
	if (
		typeof ui === "object" &&
		ui !== null &&
		"ui" in ui &&
		Object.keys(ui as object).every((k) =>
			["ui", "title", "description", "config"].includes(k),
		)
	) {
		return schema.meta(ui as FieldMeta) as T;
	}
	// Direct component / binding
	return schema.meta({ ui } as FieldMeta) as T;
}

export function text(opts?: FieldUiOptions) {
	return attach(z.string(), "text", opts);
}

/** Alias of `text` — same widget family. */
export function string(opts?: FieldUiOptions) {
	return attach(z.string(), "string", opts);
}

export function number(opts?: FieldUiOptions) {
	return attach(z.number(), "number", opts);
}

export function boolean(opts?: FieldUiOptions & { default?: boolean }) {
	const { default: defaultValue, ...uiOpts } = opts ?? {};
	let schema: z.ZodType = z.boolean();
	if (defaultValue !== undefined) {
		schema = (schema as z.ZodBoolean).default(defaultValue);
	}
	return attach(schema, "boolean", uiOpts);
}

export function select<const T extends readonly [string, ...string[]]>(
	values: T,
	opts?: FieldUiOptions,
) {
	return attach(z.enum(values), "select", opts);
}

/** Enum/select alias — `enum` is a reserved word. */
export function enumeration<const T extends readonly [string, ...string[]]>(
	values: T,
	opts?: FieldUiOptions,
) {
	return attach(z.enum(values), "enum", opts);
}

export function date(opts?: FieldUiOptions) {
	return attach(z.iso.date(), "date", opts);
}

export function datetime(opts?: FieldUiOptions) {
	return attach(z.iso.datetime(), "datetime", opts);
}

export function object<T extends Shape>(shape: T, opts?: FieldUiOptions) {
	return attach(z.object(shape), "object", opts);
}

export function array<T extends z.ZodType>(item: T, opts?: FieldUiOptions) {
	return attach(z.array(item), "array", opts);
}

/** Markdown string field — widget only; no role/segment in v1. */
export function markdown(opts?: FieldUiOptions) {
	return attach(z.string(), "markdown", opts);
}

/**
 * Reference seam — string id targeting another collection.
 * Deep select-over-collection-ids UI is later; options.collection is the hint.
 */
export function reference(collection: string, opts?: FieldUiOptions) {
	return attach(z.string(), "reference", {
		...opts,
		options: { collection, ...opts?.options },
	});
}

/** Image stub — rich wasm/srcset is an open thread. */
export function image(opts?: FieldUiOptions) {
	return attach(z.string(), "image", opts);
}

/**
 * Field-local locale map: `{ [defaultLocale]: T } & Partial<Record<others, T>>`.
 * Unknown keys rejected. Fallbacks are resolve-only (see `resolveLocale`).
 */
export function i18n<T extends z.ZodType>(inner: T, opts: I18nOptions) {
	const { locales, defaultLocale, fallbacks, label, options } = opts;
	if (!locales.includes(defaultLocale)) {
		throw new Error(
			`i18n: defaultLocale "${defaultLocale}" must be listed in locales`,
		);
	}

	const shape: Record<string, z.ZodType> = {};
	for (const locale of locales) {
		shape[locale] =
			locale === defaultLocale ? inner : (inner.optional() as z.ZodType);
	}

	return attach(z.object(shape).strict(), "i18n", {
		label,
		options: {
			locales: [...locales],
			defaultLocale,
			...(fallbacks ? { fallbacks } : {}),
			...options,
		},
	});
}

/**
 * Ordered polymorphic sections: `{ type, content }[]`.
 * Serializable ui options carry `blockTypes` / `blockLabels` only —
 * keep the live `blocks` map for `resolveBlock` (components do not cross islands).
 */
export function blocksLayout<TBlocks extends Record<string, BlockDefinition>>(
	opts: BlocksLayoutOptions<TBlocks>,
) {
	const entries = Object.entries(opts.blocks);
	if (entries.length < 1) {
		throw new Error("blocksLayout: blocks requires at least one entry");
	}

	const blockSchemas = entries.map(([id, def]) =>
		z.object({
			type: z.literal(id),
			content: def.schema,
		}),
	);

	const [firstBlock, secondBlock, ...restBlocks] = blockSchemas;
	if (!firstBlock) {
		throw new Error("blocksLayout: blocks requires at least one entry");
	}

	const itemSchema =
		secondBlock === undefined
			? firstBlock
			: z.discriminatedUnion("type", [firstBlock, secondBlock, ...restBlocks]);

	const blockTypes = entries.map(([id]) => id);
	const blockLabels: Record<string, string> = {};
	for (const [id, def] of entries) {
		if (def.label) blockLabels[id] = def.label;
	}

	const { label, options } = opts;
	return attach(z.array(itemSchema), "blocksLayout", {
		label,
		options: {
			blockTypes,
			...(Object.keys(blockLabels).length > 0 ? { blockLabels } : {}),
			...options,
		},
	});
}
