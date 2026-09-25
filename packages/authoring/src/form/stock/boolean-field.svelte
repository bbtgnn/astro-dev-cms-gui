<script lang="ts">
	import type { FieldEditorProps } from "../../config/contracts";

	let { field, label, description }: FieldEditorProps<boolean, "boolean"> =
		$props();
</script>

<label class="cms-stock-field cms-stock-field-checkbox">
	<input
		type="checkbox"
		checked={field.value ?? false}
		disabled={field.disabled}
		onchange={(e) => field.set(e.currentTarget.checked)}
	/>
	<span class="sjsf-label">{label}</span>
	{#if description}
		<small class="cms-stock-field-hint">{description}</small>
	{/if}
	{#each field.errors as err, i (i)}
		<p class="cms-stock-field-error" role="alert">{err.message}</p>
	{/each}
</label>

<style>
	.cms-stock-field-checkbox {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
	}

	.cms-stock-field-hint {
		flex-basis: 100%;
		opacity: 0.75;
	}

	.cms-stock-field-error {
		flex-basis: 100%;
		margin: 0;
		color: #b00020;
		font-size: 0.9em;
	}
</style>
