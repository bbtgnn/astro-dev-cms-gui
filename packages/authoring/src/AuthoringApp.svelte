<!--
  PROTOTYPE — reusable authoring application: collections → entries → editor.
  Receives protocol client + host-compiled editor configuration (ADR-0008).
-->
<script lang="ts">
import {
	type ContentEntry,
	type EntryIdentity,
	isCmsFetchError,
} from "@cms/crud/fetch-client";
import { onMount } from "svelte";
import type { z } from "zod";
import EntryEditor from "./EntryEditor.svelte";
import type { AuthoringClient, EditorCollections } from "./types";

let {
	client,
	collections: editorCollections,
}: {
	client: AuthoringClient;
	collections: EditorCollections;
} = $props();

let view = $state<"collections" | "entries" | "editor" | "create">(
	"collections",
);
let loading = $state(false);
let error = $state<string | null>(null);

let collections = $state.raw<{ name: string }[]>([]);
let entries = $state.raw<EntryIdentity[]>([]);
let selectedCollection = $state<string | null>(null);
let selectedEntryId = $state<string | null>(null);
let entry = $state.raw<ContentEntry | null>(null);

function errMsg(e: unknown): string {
	if (isCmsFetchError(e)) return e.message;
	return e instanceof Error ? e.message : String(e);
}

function editorSchemaFor(name: string | null): z.ZodType | null {
	if (!name) return null;
	return (editorCollections[name] as z.ZodType | undefined) ?? null;
}

const activeSchema = $derived(editorSchemaFor(selectedCollection));

async function loadCollections() {
	loading = true;
	error = null;
	try {
		const result = await client.listCollections();
		collections = result.value;
		entries = [];
		entry = null;
		selectedCollection = null;
		selectedEntryId = null;
		view = "collections";
	} catch (e) {
		error = errMsg(e);
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
		const result = await client.listEntries(name);
		entries = result.value;
		view = "entries";
	} catch (e) {
		error = errMsg(e);
		entries = [];
	} finally {
		loading = false;
	}
}

async function openEntry(id: string) {
	if (!selectedCollection) return;
	loading = true;
	error = null;
	selectedEntryId = id;
	try {
		const result = await client.getEntry(selectedCollection, id);
		if (!result.ok) {
			error = `${result.code}: ${result.message}`;
			entry = null;
			return;
		}
		entry = result.value;
		view = "editor";
	} catch (e) {
		error = errMsg(e);
		entry = null;
	} finally {
		loading = false;
	}
}

function startCreate() {
	if (!selectedCollection) return;
	selectedEntryId = null;
	entry = null;
	view = "create";
	error = null;
}

async function refreshEntries() {
	if (!selectedCollection) return;
	const result = await client.listEntries(selectedCollection);
	entries = result.value;
}

async function onSaved(saved: ContentEntry) {
	selectedEntryId = saved.id;
	entry = saved;
	view = "editor";
	await refreshEntries();
}

/** Re-fetch current entry so editor gets canonical data + revision after conflict. */
async function reloadEntry() {
	if (!selectedCollection || !selectedEntryId) return;
	loading = true;
	error = null;
	try {
		const result = await client.getEntry(selectedCollection, selectedEntryId);
		if (!result.ok) {
			error = `${result.code}: ${result.message}`;
			return;
		}
		entry = result.value;
	} catch (e) {
		error = errMsg(e);
	} finally {
		loading = false;
	}
}

async function onDeleted() {
	entry = null;
	selectedEntryId = null;
	view = "entries";
	await refreshEntries();
}

function backToEntries() {
	entry = null;
	selectedEntryId = null;
	view = "entries";
	error = null;
}

function backToCollections() {
	selectedCollection = null;
	selectedEntryId = null;
	entry = null;
	entries = [];
	view = "collections";
	error = null;
}

onMount(() => {
	void loadCollections();
});
</script>

<main>
	<p>
		<strong>PROTOTYPE / SPIKE</strong> — reusable authoring application via CMS
		protocol client + host-compiled editor configuration
	</p>

	<p>
		status:
		{#if loading}loading{:else}idle{/if}
		· view: {view}
		{#if error}
			— error: {error}
		{/if}
	</p>

	<nav>
		<button type="button" onclick={() => void loadCollections()}
			>collections</button
		>
		{#if selectedCollection}
			{@const collectionName = selectedCollection}
			<button type="button" onclick={() => void selectCollection(collectionName)}
				>{collectionName}</button
			>
		{/if}
		{#if view === "editor" && selectedEntryId}
			<span>/ {selectedEntryId}</span>
		{/if}
		{#if view === "create"}
			<span>/ (create)</span>
		{/if}
	</nav>

	{#if view === "collections"}
		<section>
			<h2>Collections</h2>
			<ul>
				{#each collections as c (c.name)}
					<li>
						<button type="button" onclick={() => void selectCollection(c.name)}>
							{c.name}
						</button>
					</li>
				{:else}
					<li>(none)</li>
				{/each}
			</ul>
		</section>
	{:else if view === "entries"}
		<section>
			<h2>Entries in {selectedCollection}</h2>
			<p>
				<button type="button" onclick={backToCollections}>← collections</button>
				<button type="button" onclick={startCreate}>create entry</button>
			</p>
			<ul>
				{#each entries as e (e.id)}
					<li>
						<button type="button" onclick={() => void openEntry(e.id)}>
							{e.id}
						</button>
					</li>
				{:else}
					<li>(none)</li>
				{/each}
			</ul>
		</section>
	{:else if view === "editor" && selectedCollection && entry}
		{#key entry.revision}
			<EntryEditor
				{client}
				collection={selectedCollection}
				entryId={entry.id}
				revision={entry.revision}
				schema={activeSchema}
				value={entry.data}
				onSaved={(saved) => void onSaved(saved)}
				onDeleted={() => void onDeleted()}
				onCancel={backToEntries}
				onReload={() => void reloadEntry()}
			/>
		{/key}
	{:else if view === "create" && selectedCollection}
		<EntryEditor
			{client}
			collection={selectedCollection}
			entryId="new-post"
			schema={activeSchema}
			value={{}}
			creating={true}
			onSaved={(saved) => void onSaved(saved)}
			onCancel={backToEntries}
		/>
	{/if}
</main>
