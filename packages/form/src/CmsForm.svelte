<!-- PROTOTYPE / SPIKE — minimal @sjsf/form + basic-theme wrap; no FieldUi registry -->
<script lang="ts">
import { createFormValidator } from "@sjsf/ajv8-validator";
import { theme } from "@sjsf/basic-theme";
import { BasicForm, createForm, type Schema } from "@sjsf/form";
import { createFormIdBuilder } from "@sjsf/form/id-builders/modern";
import { createFormMerger } from "@sjsf/form/mergers/modern";
import { resolver } from "@sjsf/form/resolvers/basic";
import { translation } from "@sjsf/form/translations/en";
import { untrack } from "svelte";
import "@sjsf/basic-theme/css/basic.css";

let {
	schema = null,
	value = {},
	title = "@cms/form",
	onSubmit,
}: {
	schema?: Record<string, unknown> | null;
	value?: Record<string, unknown>;
	title?: string;
	onSubmit?: (data: Record<string, unknown>) => void;
} = $props();

let lastSubmit = $state<Record<string, unknown> | null>(null);

// Spike: bind live form value via sjsf Bind API (avoid getValueSnapshot —
// Vite/Astro resolves @sjsf/form to main.js which does not export it).
let liveValue = $state<Record<string, unknown>>({});

// Spike: create once from initial props (schema/value do not hot-swap).
const form = untrack(() => {
	liveValue = { ...value };
	return schema
		? createForm({
				theme,
				schema: schema as Schema,
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
			})
		: null;
});
</script>

<section>
	<p><small>PROTOTYPE / SPIKE — sjsf basic theme</small></p>
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
