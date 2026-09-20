<!--
  Direct textWidget for markdown-like body — supplied via project editor config
  (virtual:@cms/config), not Astro props or the CMS protocol.

  Props match SJSF textWidget structurally so the host template need not
  depend on @sjsf/form (mechanism proof only; #7 still owns the public contract).
-->
<script lang="ts">
	let {
		config,
		value = $bindable(""),
	}: {
		config?: { uiSchema?: Record<string, unknown> };
		value?: string;
	} = $props();

	const title = $derived(
		((config?.uiSchema?.["ui:options"] as { title?: string } | undefined)
			?.title ?? "Body"),
	);
</script>

<label class="cms-body-editor">
	<span class="sjsf-label">{title}</span>
	<textarea
		class="sjsf-text-input cms-body-editor-input"
		bind:value
		rows="12"
		placeholder="Markdown-like body (direct editor)"
	></textarea>
	<small class="cms-body-editor-hint"
		>Direct Svelte field via <code>virtual:@cms/config</code></small
	>
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
</style>
