<!-- PROTOTYPE / SPIKE — entry editor: CmsForm + upsert / delete + Zod 400 UI -->
<script lang="ts">
import {
	type ContentEntry,
	createFetchClient,
	isCmsFetchError,
} from "@cms/crud/fetch-client";
import type { UiSchemaNode } from "@cms/fields";
import { CmsForm } from "@cms/form";

let {
	collection,
	entryId,
	schema = null,
	uiSchema = undefined,
	value = {},
	creating = false,
	onSaved,
	onDeleted,
	onCancel,
}: {
	collection: string;
	entryId: string;
	schema?: Record<string, unknown> | null;
	uiSchema?: UiSchemaNode;
	value?: Record<string, unknown>;
	creating?: boolean;
	onSaved?: (entry: ContentEntry) => void;
	onDeleted?: () => void;
	onCancel?: () => void;
} = $props();

const client = createFetchClient("/_cms");

/** Create-flow id field; default matches tracer pathMap `new-post`. */
let idDraft = $state("new-post");
let busy = $state(false);
let error = $state<string | null>(null);
let issues = $state.raw<unknown>(null);
let lastSaved = $state.raw<ContentEntry | null>(null);

function clearErrors() {
	error = null;
	issues = null;
}

async function save(data: Record<string, unknown>) {
	const id = creating ? idDraft.trim() : entryId;
	if (!id) {
		error = "Entry id is required";
		issues = null;
		return;
	}
	busy = true;
	clearErrors();
	try {
		const entry = await client.upsertEntry({
			id,
			collection,
			data,
		});
		lastSaved = entry;
		onSaved?.(entry);
	} catch (e) {
		if (isCmsFetchError(e)) {
			error = e.message;
			issues = e.issues ?? null;
		} else {
			error = e instanceof Error ? e.message : String(e);
			issues = null;
		}
	} finally {
		busy = false;
	}
}

async function remove() {
	if (creating) return;
	if (!confirm(`Delete ${collection}/${entryId}?`)) return;
	busy = true;
	clearErrors();
	try {
		await client.deleteEntry(collection, entryId);
		onDeleted?.();
	} catch (e) {
		if (isCmsFetchError(e)) {
			error = e.message;
			issues = e.issues ?? null;
		} else {
			error = e instanceof Error ? e.message : String(e);
			issues = null;
		}
	} finally {
		busy = false;
	}
}

/** Force invalid payload to demo Zod 400 surfacing (posts title must be string). */
async function saveInvalid() {
	await save({
		title: 123,
		draft: false,
		body: "intentionally invalid title type",
		author: "ada",
	} as unknown as Record<string, unknown>);
}
</script>

<section>
	<p>
		<strong>Editor</strong>
		— {collection}/{creating ? "(new)" : entryId}
		{#if busy}
			<span>…busy</span>
		{/if}
	</p>

	{#if creating}
		<p>
			<label>
				new id
				<input bind:value={idDraft} placeholder="new-post" />
			</label>
			<small>tracer pathMap includes <code>new-post</code></small>
		</p>
	{/if}

	{#if error}
		<p role="alert">error: {error}</p>
	{/if}
	{#if issues}
		<details open>
			<summary>validation issues (Zod 400)</summary>
			<pre>{JSON.stringify(issues, null, 2)}</pre>
		</details>
	{/if}

	{#if schema}
		{#key `${collection}:${creating ? "new" : entryId}:${JSON.stringify(value)}`}
			<CmsForm
				title={`${collection} / ${creating ? idDraft || "new" : entryId}`}
				{schema}
				{uiSchema}
				{value}
				onSubmit={(data) => void save(data)}
			/>
		{/key}
	{:else}
		<p>No JSON Schema for <code>{collection}</code> — raw upsert not wired.</p>
	{/if}

	<p>
		<button type="button" disabled={busy} onclick={() => onCancel?.()}
			>back</button
		>
		{#if !creating}
			<button type="button" disabled={busy} onclick={() => void remove()}
				>delete</button
			>
		{/if}
		<button type="button" disabled={busy} onclick={() => void saveInvalid()}
			>save invalid (expect 400)</button
		>
	</p>

	{#if lastSaved}
		<details>
			<summary>last saved entry</summary>
			<pre>{JSON.stringify(lastSaved, null, 2)}</pre>
		</details>
	{/if}
</section>
