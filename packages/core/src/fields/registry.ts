import type { BuiltInWidget, FieldUiRegistryEntry } from "./types";

const defaults: Record<BuiltInWidget, FieldUiRegistryEntry> = {
	text: { widget: "text", sjsfWidget: "textWidget" },
	string: { widget: "string", sjsfWidget: "textWidget" },
	number: { widget: "number", sjsfWidget: "numberWidget" },
	boolean: { widget: "boolean", sjsfWidget: "checkboxWidget" },
	select: { widget: "select", sjsfWidget: "selectWidget" },
	enum: { widget: "enum", sjsfWidget: "selectWidget" },
	date: { widget: "date", sjsfWidget: "textWidget" },
	datetime: { widget: "datetime", sjsfWidget: "textWidget" },
	object: { widget: "object" },
	array: { widget: "array" },
	markdown: {
		widget: "markdown",
		sjsfWidget: "textWidget",
		/** String key → sjsf extra widget (see @sjsf/basic-theme textarea-include). */
		component: "textareaWidget",
		options: { textarea: { rows: 10 } },
		stub: false,
	},
	/** Minimum text until live listEntries select (still stub). */
	reference: { widget: "reference", sjsfWidget: "textWidget", stub: true },
	/** Path string; form uses ImageField (upload → original asset path). */
	image: {
		widget: "image",
		sjsfWidget: "textWidget",
		component: "imageField",
		stub: false,
	},
	/** Object of locale keys; inner FieldUi propagates via toUiSchema. */
	i18n: {
		widget: "i18n",
		sjsfWidget: "objectField",
		/** String key → @cms/authoring I18nField (locale switcher). */
		component: "i18nField",
		stub: false,
	},
	/** Polymorphic `{ type, content }[]`; form uses BlocksLayoutField. */
	blocksLayout: {
		widget: "blocksLayout",
		sjsfWidget: "arrayField",
		/** String key → @cms/authoring BlocksLayoutField. */
		component: "blocksLayoutField",
		stub: false,
	},
};

/** Mutable FieldUi registry — widget id → default descriptor / component binding. */
export const fieldUiRegistry: Record<string, FieldUiRegistryEntry> = {
	...defaults,
};

export function getFieldUiDefault(
	widget: string,
): FieldUiRegistryEntry | undefined {
	return fieldUiRegistry[widget];
}

/**
 * Register or override a widget entry.
 * `component` may be a Svelte component; typed unknown to keep this package Svelte-free.
 */
export function registerFieldUi(
	widget: string,
	entry: Partial<FieldUiRegistryEntry>,
): void {
	const prev = fieldUiRegistry[widget];
	fieldUiRegistry[widget] = {
		...prev,
		...entry,
		widget: entry.widget ?? prev?.widget ?? widget,
	};
}
