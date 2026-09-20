<!--
  Authoring application: collections → entries → editor.
  Receives protocol client + host-compiled editor configuration (ADR-0008).
  Owns AuthoringSession lifecycle; EntryEditor is a thin session view.
-->
<script lang="ts">
import {
	type CmsCapabilities,
	type ContentEntry,
	type EntryIdentity,
	isCmsFetchError,
} from "@cms/core/fetch-client";
import { onDestroy, onMount } from "svelte";
import EntryEditor from "./EntryEditor.svelte";
import {
	type AuthoringSession,
	createAuthoringSession,
} from "./session";
import type {
	AuthoringClient,
	EditorCollectionInput,
	EditorCollections,
	GetPreviewUrl,
} from "./types";

let {
	client,
	collections: editorCollections,
	getPreviewUrl = undefined,
}: {
	client: AuthoringClient;
	collections: EditorCollections;
	/**
	 * Optional host-compiled preview URL builder (ADR-0013).
	 * Absent / returning null → no preview action (no broken control).
	 */
	getPreviewUrl?: GetPreviewUrl;
} = $props();

let view = $state<"collections" | "entries" | "editor" | "create">(
	"collections",
);
let loading = $state(false);
let error = $state<string | null>(null);

let capabilities = $state.raw<CmsCapabilities | null>(null);
let collections = $state.raw<{ name: string }[]>([]);
let entries = $state.raw<EntryIdentity[]>([]);
let selectedCollection = $state<string | null>(null);
let selectedEntryId = $state<string | null>(null);
/** Parent-owned session — disposed when leaving editor/create or remounting. */
let session = $state.raw<AuthoringSession | null>(null);

function disposeSession() {
	session?.dispose();
	session = null;
}

function errMsg(e: unknown): string {
	if (isCmsFetchError(e)) return e.message;
	return e instanceof Error ? e.message : String(e);
}

function editorSchemaFor(name: string | null): EditorCollectionInput | null {
	if (!name) return null;
	return editorCollections[name] ?? null;
}

const activeSchema = $derived(editorSchemaFor(selectedCollection));

async function loadCapabilities() {
	const result = await client.getCapabilities();
	capabilities = result.value;
}

async function loadCollections() {
	loading = true;
	error = null;
	try {
		disposeSession();
		await loadCapabilities();
		const result = await client.listCollections();
		collections = result.value;
		entries = [];
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
	disposeSession();
	selectedCollection = name;
	selectedEntryId = null;
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
			disposeSession();
			return;
		}
		disposeSession();
		session = createAuthoringSession({
			client,
			collection: selectedCollection,
			mode: { kind: "edit", entry: result.value },
			schema: editorSchemaFor(selectedCollection),
			capabilities,
			getPreviewUrl,
		});
		view = "editor";
	} catch (e) {
		error = errMsg(e);
		disposeSession();
	} finally {
		loading = false;
	}
}

function startCreate() {
	if (!selectedCollection) return;
	disposeSession();
	selectedEntryId = null;
	session = createAuthoringSession({
		client,
		collection: selectedCollection,
		mode: { kind: "create" },
		schema: editorSchemaFor(selectedCollection),
		capabilities,
		getPreviewUrl,
	});
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
	if (view === "create") view = "editor";
	await refreshEntries();
}

async function onDeleted() {
	disposeSession();
	selectedEntryId = null;
	view = "entries";
	await refreshEntries();
}

function backToEntries() {
	disposeSession();
	selectedEntryId = null;
	view = "entries";
	error = null;
}

function backToCollections() {
	disposeSession();
	selectedCollection = null;
	selectedEntryId = null;
	entries = [];
	view = "collections";
	error = null;
}

onMount(() => {
	void loadCollections();
});

onDestroy(() => {
	disposeSession();
});
</script>

<main>
	<p>
		Authoring application over the CMS protocol and host-compiled editor
		configuration.
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
	{:else if (view === "editor" || view === "create") && selectedCollection && session}
		<EntryEditor
			{session}
			collection={selectedCollection}
			schema={activeSchema}
			onSaved={(saved) => void onSaved(saved)}
			onDeleted={() => void onDeleted()}
			onCancel={backToEntries}
		/>
	{/if}
</main>
