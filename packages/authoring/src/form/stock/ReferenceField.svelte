<!-- Stub reference editor — FieldEditorProps; full picker is a later slice. -->
<script lang="ts">
	import type { FieldEditorProps } from "../../config/contracts";

	let { field, label, description }: FieldEditorProps<string, "reference"> =
		$props();
</script>

<label class="cms-stock-field">
	<span class="sjsf-label">{label}</span>
	<input
		class="sjsf-text-input"
		type="text"
		value={field.value ?? ""}
		disabled={field.disabled}
		oninput={(e) => field.set(e.currentTarget.value)}
		placeholder="Reference id (stub)"
		autocomplete="off"
	/>
	{#if description}
		<small class="cms-stock-field-hint">{description}</small>
	{:else}
		<small class="cms-stock-field-hint">Reference picker stub</small>
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
