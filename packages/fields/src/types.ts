/**
 * FieldUi — widget-keyed UI descriptor (no separate id).
 * Direct `meta.ui` Component bindings are typed loosely; `@cms/fields` stays Svelte-free.
 */

import type { z } from "zod";

export type FieldUi = {
	widget: string;
	label?: string;
	options?: Record<string, unknown>;
};

/** Collection chrome on the root schema via `.meta(config(...))`. */
export type CollectionConfig = {
	label?: string;
	hidden?: boolean;
	pathTemplate?: string;
	base?: string;
	/** Reserved — not implemented in v1. */
	kind?: "singleton";
	extension?: "yaml" | "yml";
};

/**
 * Zod `.meta()` bag for fields.
 * - Built-ins: `ui` is FieldUi (`{ widget, label?, options? }`)
 * - Overrides: `ui` is a Svelte component (or other UI binding)
 */
export type FieldMeta = {
	ui?: FieldUi | unknown;
	title?: string;
	description?: string;
	config?: CollectionConfig;
};

export type FieldUiOptions = {
	label?: string;
	options?: Record<string, unknown>;
};

/** Options for `i18n(inner, opts)` — field-local locale map. */
export type I18nOptions = FieldUiOptions & {
	/** Configured locale keys (must include `defaultLocale`). */
	locales: readonly [string, ...string[]];
	/** Required key when the map object is present. */
	defaultLocale: string;
	/** Optional locale → fallback locale (resolve-only; not written to disk). */
	fallbacks?: Partial<Record<string, string>>;
};

/** Options for rich `image()` — path string + optional asset folder name. */
export type ImageOptions = FieldUiOptions & {
	/** Folder name under `{id}/` (default `cover`). */
	folder?: string;
};

/**
 * One available block type for `blocksLayout`.
 * `component` is opaque (Astro/Svelte/etc.) — `@cms/fields` stays framework-free.
 * Hosts must keep this map for `resolveBlock` (not serialized into uiSchema).
 */
export type BlockDefinition<TSchema extends z.ZodType = z.ZodType> = {
	schema: TSchema;
	/** Site render binding — not written into serializable FieldUi options. */
	component?: unknown;
	label?: string;
};

/** Options for `blocksLayout({ blocks, … })`. */
export type BlocksLayoutOptions<
	TBlocks extends Record<string, BlockDefinition> = Record<
		string,
		BlockDefinition
	>,
> = FieldUiOptions & {
	/** Required; at least one entry. */
	blocks: TBlocks;
};

export type FieldUiRegistryEntry = FieldUi & {
	/** Hint for sjsf foundational widget keys (textWidget, checkboxWidget, …). */
	sjsfWidget?: string;
	/** Reserved / open-thread — form may show unsupported UI until implemented. */
	stub?: boolean;
	/**
	 * Optional default component binding for this widget.
	 * Typed as unknown so `@cms/fields` stays Svelte-free.
	 */
	component?: unknown;
};

export type BuiltInWidget =
	| "text"
	| "string"
	| "number"
	| "boolean"
	| "select"
	| "enum"
	| "date"
	| "datetime"
	| "object"
	| "array"
	| "markdown"
	| "reference"
	| "image"
	| "i18n"
	| "blocksLayout";
