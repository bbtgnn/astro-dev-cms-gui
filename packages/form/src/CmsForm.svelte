<!-- @cms/form — sjsf wrap; resolves FieldUi + meta.ui Component overrides -->
<script lang="ts">
import {
	stripUiFromJsonSchema,
	toFormSchemas,
	toUiSchema,
	type UiSchemaNode,
} from "@cms/fields";
import { createFormValidator } from "@sjsf/ajv8-validator";
import {
	BasicForm,
	createForm,
	type Schema,
	type UiSchemaRoot,
} from "@sjsf/form";
import { createFormIdBuilder } from "@sjsf/form/id-builders/modern";
import { createFormMerger } from "@sjsf/form/mergers/modern";
import { resolver } from "@sjsf/form/resolvers/basic";
import { translation } from "@sjsf/form/translations/en";
import { setContext, untrack } from "svelte";
import type { z } from "zod";
import "@sjsf/basic-theme/css/basic.css";
// Registers textareaWidget for markdown multi-line fields (P5).
import "@sjsf/basic-theme/extra-widgets/textarea-include";
import { theme } from "./cms-theme";
import type {
	CmsAssetsFieldContext,
	CmsEntryContext,
} from "./ImageField.svelte";

function isZodSchema(value: unknown): value is z.ZodType {
	return (
		typeof value === "object" &&
		value !== null &&
		"_zod" in value &&
		typeof (value as { parse?: unknown }).parse === "function"
	);
}

let {
	schema = null,
	uiSchema: uiSchemaProp = undefined,
	value = {},
	title = "@cms/form",
	collection = "",
	entryId = "",
	assets = null,
	onSubmit,
}: {
	/** JSON Schema (preferred across Astro islands) or live Zod when same-bundle. */
	schema?: z.ZodType | Record<string, unknown> | null;
	/**
	 * sjsf uiSchema from FieldUi. Prefer precomputing with `toUiSchema` /
	 * `toFormSchemas` in the Astro page so labels survive `client:only` props
	 * (live Zod `.meta()` / Component refs do not serialize across islands).
	 */
	uiSchema?: UiSchemaNode;
	value?: Record<string, unknown>;
	title?: string;
	/** Entry context for image upload (and similar). */
	collection?: string;
	entryId?: string;
	/** Capability-aware image upload seam (omit / null → upload disabled). */
	assets?: CmsAssetsFieldContext | null;
	onSubmit?: (data: Record<string, unknown>) => void;
} = $props();

const entryBox: CmsEntryContext = $state({
	collection: "",
	id: "",
});

const assetsBox: CmsAssetsFieldContext = $state({
	uploadEnabled: false,
});

$effect(() => {
	entryBox.collection = collection;
	entryBox.id = entryId;
});

$effect(() => {
	assetsBox.uploadEnabled = assets?.uploadEnabled === true;
	assetsBox.maxUploadBytes = assets?.maxUploadBytes;
	assetsBox.uploadImage = assets?.uploadImage;
});

setContext("cms.entry", entryBox);
setContext("cms.assets", assetsBox);

let lastSubmit = $state<Record<string, unknown> | null>(null);
let liveValue = $state<Record<string, unknown>>({});

const form = untrack(() => {
	liveValue = { ...value };
	if (schema == null) return null;

	let jsonSchema: Record<string, unknown>;
	let uiSchema: UiSchemaNode;

	if (isZodSchema(schema)) {
		const derived = toFormSchemas(schema);
		jsonSchema = stripUiFromJsonSchema(derived.schema);
		uiSchema = uiSchemaProp ?? derived.uiSchema;
	} else {
		jsonSchema = stripUiFromJsonSchema(schema);
		uiSchema = uiSchemaProp ?? toUiSchema(schema);
	}

	return createForm({
		theme,
		schema: jsonSchema as Schema,
		uiSchema: uiSchema as UiSchemaRoot,
		resolver,
		translation,
		merger: createFormMerger,
		validator: createFormValidator,
		idBuilder: createFormIdBuilder,
		initialValue: value,
		value: [
			() => liveValue,
			(v) => {
				liveValue = v as Record<string, unknown>;
			},
		],
		onSubmit: (data) => {
			const record = data as Record<string, unknown>;
			lastSubmit = record;
			onSubmit?.(record);
		},
	});
});
</script>

<section>
	<p><small>@cms/form — FieldUi → sjsf uiSchema</small></p>
	<h2>{title}</h2>
	{#if form === null}
		<p>form shell — no schema</p>
	{:else}
		<BasicForm {form} />
		<h3>live value (Bind API)</h3>
		<pre>{JSON.stringify(liveValue, null, 2)}</pre>
		{#if lastSubmit !== null}
			<h3>last submit</h3>
			<pre>{JSON.stringify(lastSubmit, null, 2)}</pre>
		{/if}
	{/if}
</section>
