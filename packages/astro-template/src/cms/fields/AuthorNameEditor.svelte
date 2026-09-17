<!--
  Direct textWidget for authors.name — supplied via project editor config
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
			?.title ?? "Author name"),
	);
</script>

<label class="cms-author-name">
	<span class="sjsf-label">{title}</span>
	<input
		class="sjsf-text-input cms-author-name-input"
		type="text"
		bind:value
		placeholder="Direct editor (Vite module graph)"
		autocomplete="off"
	/>
	<small class="cms-author-name-hint"
		>Direct Svelte field via <code>virtual:@cms/config</code></small
	>
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
</style>
