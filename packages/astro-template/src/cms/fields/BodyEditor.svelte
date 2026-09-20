<!--
  Direct string field for markdown-like body — FieldEditorProps (shell-owned contract).
  Supplied via project editor config (virtual:@cms/config).
-->
<script lang="ts">
	import type { FieldEditorProps } from "@cms/authoring/config";

	let { field, label, description }: FieldEditorProps<string, "string"> =
		$props();
</script>

<label class="cms-body-editor">
	<span class="sjsf-label">{label}</span>
	<textarea
		class="sjsf-text-input cms-body-editor-input"
		value={field.value ?? ""}
		disabled={field.disabled}
		oninput={(e) => field.set(e.currentTarget.value)}
		rows="12"
		placeholder="Markdown-like body (direct editor)"
	></textarea>
	{#if description}
		<small class="cms-body-editor-hint">{description}</small>
	{:else}
		<small class="cms-body-editor-hint"
			>Direct Svelte field via <code>virtual:@cms/config</code></small
		>
	{/if}
	{#each field.errors as err, i (i)}
		<p class="cms-body-editor-error" role="alert">{err.message}</p>
	{/each}
</label>

<style>
	.cms-body-editor {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.cms-body-editor-input {
		font: inherit;
	}

	.cms-body-editor-hint {
		opacity: 0.75;
	}

	.cms-body-editor-error {
		margin: 0;
		color: #b00020;
		font-size: 0.9em;
	}
</style>
