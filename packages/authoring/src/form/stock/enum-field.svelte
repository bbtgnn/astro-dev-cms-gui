<script lang="ts">
	import type { FieldEditorProps } from "../../config/contracts";

	export type EnumFieldOption = {
		value: string;
		label: string;
		disabled?: boolean;
	};

	let {
		field,
		label,
		description,
		options = [],
	}: FieldEditorProps<string, "enum"> & {
		options?: EnumFieldOption[];
	} = $props();
</script>

<label class="cms-stock-field">
	<span class="sjsf-label">{label}</span>
	<select
		class="sjsf-text-input"
		value={field.value ?? ""}
		disabled={field.disabled}
		onchange={(e) => field.set(e.currentTarget.value)}
	>
		<option value="">—</option>
		{#each options as opt (opt.value)}
			<option value={opt.value} disabled={opt.disabled}>{opt.label}</option>
		{/each}
	</select>
	{#if description}
		<small class="cms-stock-field-hint">{description}</small>
	{/if}
	{#each field.errors as err, i (i)}
		<p class="cms-stock-field-error" role="alert">{err.message}</p>
	{/each}
</label>

<style>
	.cms-stock-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.cms-stock-field-hint {
		opacity: 0.75;
	}

	.cms-stock-field-error {
		margin: 0;
		color: #b00020;
		font-size: 0.9em;
	}
</style>
