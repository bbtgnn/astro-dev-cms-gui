<!-- PROTOTYPE / SPIKE — Pass 3 form shell stub; no svelte-jsonschema-form yet -->
<script lang="ts">
	let {
		schema = null,
		value = {},
		title = '@cms/form'
	}: {
		schema?: Record<string, unknown> | null;
		value?: Record<string, unknown>;
		title?: string;
	} = $props();
</script>

<section>
	<h2>{title}</h2>
	{#if schema === null}
		<p>form shell stub — no schema</p>
	{:else}
		<pre>{JSON.stringify(schema, null, 2)}</pre>
		<pre>{JSON.stringify(value, null, 2)}</pre>
	{/if}
</section>
