<!-- PROTOTYPE / SPIKE — Track B: can shell UI list via createFetchClient? -->
<script lang="ts">
// Browser-safe subpath — package root re-exports Node FS writers.
import { type ContentEntry, createFetchClient } from "@cms/crud/fetch-client";
import { onMount } from "svelte";

const client = createFetchClient("/_cms");

let loading = $state(false);
let error = $state<string | null>(null);

let collections = $state.raw<{ name: string }[]>([]);
let entries = $state.raw<{ id: string }[]>([]);
let selectedCollection = $state<string | null>(null);
let selectedEntryId = $state<string | null>(null);
let entry = $state.raw<ContentEntry | null>(null);

async function loadCollections() {
	loading = true;
	error = null;
	try {
		collections = await client.listCollections();
		entries = [];
		entry = null;
		selectedCollection = null;
		selectedEntryId = null;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	} finally {
		loading = false;
	}
}

async function selectCollection(name: string) {
	loading = true;
	error = null;
	selectedCollection = name;
	selectedEntryId = null;
	entry = null;
	try {
		entries = await client.listEntries(name);
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		entries = [];
	} finally {
		loading = false;
	}
}

async function selectEntry(id: string) {
	if (!selectedCollection) return;
	loading = true;
	error = null;
	selectedEntryId = id;
	try {
		entry = await client.getEntry(selectedCollection, id);
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		entry = null;
	} finally {
		loading = false;
	}
}

onMount(() => {
	void loadCollections();
});
</script>

<main>
	<p>
		<strong>PROTOTYPE / SPIKE</strong> — Track B shell list via
		<code>createFetchClient</code>
	</p>

	<p>
		status:
		{#if loading}loading{:else}idle{/if}
		{#if error}
			— error: {error}
		{/if}
	</p>

	<section>
		<h2>Collections</h2>
		<button type="button" onclick={() => void loadCollections()}
			>reload collections</button
		>
		<ul>
			{#each collections as c (c.name)}
				<li>
					<button
						type="button"
						onclick={() => void selectCollection(c.name)}
						aria-pressed={selectedCollection === c.name}
					>
						{c.name}
					</button>
				</li>
			{:else}
				<li>(none)</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2>Entries {selectedCollection ? `in ${selectedCollection}` : ""}</h2>
		<ul>
			{#each entries as e (e.id)}
				<li>
					<button
						type="button"
						onclick={() => void selectEntry(e.id)}
						aria-pressed={selectedEntryId === e.id}
					>
						{e.id}
					</button>
				</li>
			{:else}
				<li>{selectedCollection ? "(none)" : "(pick a collection)"}</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2>Entry JSON</h2>
		{#if entry}
			<pre>{JSON.stringify(entry, null, 2)}</pre>
		{:else}
			<p>(pick an entry)</p>
		{/if}
	</section>

	<details>
		<summary>raw state dump</summary>
		<pre>{JSON.stringify(
			{
				loading,
				error,
				selectedCollection,
				selectedEntryId,
				collections,
				entries,
				entry,
			},
			null,
			2,
		)}</pre>
	</details>
</main>
