<!--
  PROTOTYPE — reusable authoring application: collections → entries → editor.
  Receives protocol client + host-compiled editor configuration (ADR-0008).
-->
<script lang="ts">
import {
	type CmsCapabilities,
	type ContentEntry,
	type EntryIdentity,
	isCmsFetchError,
} from "@cms/crud/fetch-client";
import { onMount } from "svelte";
import type { z } from "zod";
import { offersAssetUpload, offersEntryDeletion } from "./capabilities";
import EntryEditor from "./EntryEditor.svelte";
import type {
	AuthoringClient,
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
let entry = $state.raw<ContentEntry | null>(null);
/**
 * Entry id that completed write-back in this editor session.
 * Preview opens the site route for persisted content only (not form state).
 */
let previewEligibleId = $state<string | null>(null);
/**
 * Bumps when the editor must remount (open / conflict reload / create→edit).
 * Successful autosave does not bump — keeps browser form state (issue #19).
 */
let editorMountKey = $state(0);

const canDelete = $derived(offersEntryDeletion(capabilities));
const canUploadAssets = $derived(offersAssetUpload(capabilities));
const maxUploadBytes = $derived(capabilities?.assets?.maxUploadBytes);

function errMsg(e: unknown): string {
	if (isCmsFetchError(e)) return e.message;
	return e instanceof Error ? e.message : String(e);
}

function editorSchemaFor(name: string | null): z.ZodType | null {
	if (!name) return null;
	return (editorCollections[name] as z.ZodType | undefined) ?? null;
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
		await loadCapabilities();
		const result = await client.listCollections();
		collections = result.value;
		entries = [];
		entry = null;
		selectedCollection = null;
		selectedEntryId = null;
		previewEligibleId = null;
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
	previewEligibleId = null;
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
	previewEligibleId = null;
	try {
		const result = await client.getEntry(selectedCollection, id);
		if (!result.ok) {
			error = `${result.code}: ${result.message}`;
			entry = null;
			return;
		}
		entry = result.value;
		editorMountKey += 1;
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
	previewEligibleId = null;
	editorMountKey += 1;
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
	previewEligibleId = saved.id;
	if (view === "create") {
		entry = saved;
		editorMountKey += 1;
		view = "editor";
	}
	// Existing editor: do not replace entry.data — form holds browser state;
	// EntryEditor already stores the new revision for the next guarded write.
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
		editorMountKey += 1;
	} catch (e) {
		error = errMsg(e);
	} finally {
		loading = false;
	}
}

async function onDeleted() {
	entry = null;
	selectedEntryId = null;
	previewEligibleId = null;
	view = "entries";
	await refreshEntries();
}

function backToEntries() {
	entry = null;
	selectedEntryId = null;
	previewEligibleId = null;
	view = "entries";
	error = null;
}

function backToCollections() {
	selectedCollection = null;
	selectedEntryId = null;
	entry = null;
	entries = [];
	previewEligibleId = null;
	view = "collections";
	error = null;
}

/** Site URL only after successful write-back; identity only — no draft payload. */
function previewUrlFor(collection: string, id: string): string | null {
	if (!getPreviewUrl || previewEligibleId !== id) return null;
	const url = getPreviewUrl(collection, id);
	if (typeof url !== "string") return null;
	const trimmed = url.trim();
	return trimmed.length > 0 ? trimmed : null;
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
		{#if capabilities}
			· delete: {canDelete ? "supported" : "unsupported"}
			· assets: {canUploadAssets ? "supported" : "unsupported"}
		{/if}
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
		{#key `${entry.id}:${editorMountKey}`}
			<EntryEditor
				{client}
				collection={selectedCollection}
				entryId={entry.id}
				revision={entry.revision}
				schema={activeSchema}
				value={entry.data}
				{canDelete}
				{canUploadAssets}
				{maxUploadBytes}
				previewUrl={previewUrlFor(selectedCollection, entry.id)}
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
			{canDelete}
			{canUploadAssets}
			{maxUploadBytes}
			previewUrl={null}
			onSaved={(saved) => void onSaved(saved)}
			onCancel={backToEntries}
		/>
	{/if}
</main>
