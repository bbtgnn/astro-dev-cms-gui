/**
 * Field schemas — Zod builders, FieldUi registry, Zod→JSON Schema / uiSchema.
 * Svelte-free: components live in consumer schema modules / @cms/authoring.
 */

import type { z as ZodNS } from "zod";
import { boolean, markdown, object, text } from "./builders";
import { config } from "./meta";

export {
	array,
	blocksLayout,
	boolean,
	date,
	datetime,
	enumeration,
	field,
	i18n,
	image,
	markdown,
	number,
	object,
	reference,
	select,
	string,
	text,
} from "./builders";
export {
	stripUiFromJsonSchema,
	toFormSchemas,
	toJsonSchema,
	toUiSchema,
	type UiSchemaNode,
} from "./json-schema";

export {
	config,
	fieldUiFromOptions,
	isFieldUi,
	isUiComponent,
	readFieldMeta,
	resolveFieldUi,
	withFieldUi,
} from "./meta";
export {
	fieldUiRegistry,
	getFieldUiDefault,
	registerFieldUi,
} from "./registry";
export {
	type BlocksLayoutItem,
	type ResolvedBlock,
	resolveBlock,
} from "./resolve-block";
export {
	contentAssetPath,
	imageFolderFromCanonical,
} from "./resolve-image";
export {
	type ResolveLocaleOptions,
	resolveLocale,
} from "./resolve-locale";
export type {
	BlockDefinition,
	BlocksLayoutOptions,
	BuiltInWidget,
	CollectionConfig,
	FieldMeta,
	FieldUi,
	FieldUiOptions,
	FieldUiRegistryEntry,
	I18nOptions,
	ImageOptions,
} from "./types";

/**
 * Sample posts schema for form / write-back examples.
 * Built with named builders + FieldUi.
 */
export const samplePostsSchema = object(
	{
		title: text({ label: "Title" }),
		draft: boolean({ label: "Draft", default: false }),
		body: markdown({ label: "Body" }),
	},
	{ label: "Posts" },
).meta(config({ label: "Posts" }));

export type SamplePostsInput = ZodNS.input<typeof samplePostsSchema>;

export { z } from "zod";
