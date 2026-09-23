<!--
  Direct string field for authors.name — FieldEditorProps (shell-owned contract).
  Bound via cms.components catalog key + virtual:@cms/components.
-->
<script lang="ts">
	import type { FieldEditorProps } from "@cms/authoring/config";

	let { field, label, description }: FieldEditorProps<string, "string"> =
		$props();
</script>

<label class="cms-author-name">
	<span class="sjsf-label">{label}</span>
	<input
		class="sjsf-text-input cms-author-name-input"
		type="text"
		value={field.value ?? ""}
		disabled={field.disabled}
		oninput={(e) => field.set(e.currentTarget.value)}
		placeholder="Custom editor (overlay demo)"
		autocomplete="off"
	/>
	{#if description}
		<small class="cms-author-name-hint">{description}</small>
	{:else}
		<small class="cms-author-name-hint"
			>Custom Svelte field via <code>virtual:@cms/components</code></small
		>
	{/if}
	{#each field.errors as err, i (i)}
		<p class="cms-author-name-error" role="alert">{err.message}</p>
	{/each}
</label>

<style>
	.cms-author-name {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.cms-author-name-input {
		font: inherit;
	}

	.cms-author-name-hint {
		opacity: 0.75;
	}

	.cms-author-name-error {
		margin: 0;
		color: #b00020;
		font-size: 0.9em;
	}
</style>
