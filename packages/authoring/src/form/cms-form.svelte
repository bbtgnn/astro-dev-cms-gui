<script lang="ts">
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
import "@sjsf/basic-theme/css/basic.css";
import { theme } from "./cms-theme";
import type {
	CmsAssetsFieldContext,
	CmsEntryContext,
} from "./image-field.svelte";
import type { UiSchemaNode } from "./ui-schema";

let {
	schema = null,
	uiSchema: uiSchemaProp = undefined,
	value = {},
	title = "@cms/authoring",
	collection = "",
	entryId = "",
	assets = null,
	onSubmit,
	onChange,
}: {
	/** Ajv-safe JSON Schema from IR form-model lowering (ADR-0019). */
	schema?: Record<string, unknown> | null;
	uiSchema?: UiSchemaNode;
	value?: Record<string, unknown>;
	title?: string;
	collection?: string;
	entryId?: string;
	/** Capability-aware image upload seam (omit / null → upload disabled). */
	assets?: CmsAssetsFieldContext | null;
	onSubmit?: (data: Record<string, unknown>) => void;
	/**
	 * Fired when the author edits form state (Bind setter), not on initial bind.
	 * Used by authoring autosave — values update immediately; write-back is separate.
	 */
	onChange?: (data: Record<string, unknown>) => void;
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

	const uiSchema: UiSchemaNode = uiSchemaProp ?? {};

	return createForm({
		theme,
		schema: schema as Schema,
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
				const record = v as Record<string, unknown>;
				liveValue = record;
				// Author edits only — initialValue assignment above does not use this setter.
				onChange?.(record);
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
	<p><small>@cms/authoring — form shell (IR → sjsf)</small></p>
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
