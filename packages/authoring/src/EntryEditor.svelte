<!--
  PROTOTYPE — entry editor: thin view over an AuthoringSession.
  Session owns write-back and asset upload context (ADR-0008 / 0014).
-->
<script lang="ts">
import type { ContentEntry } from "@cms/crud/fetch-client";
import { CmsForm } from "@cms/form";
import { onMount } from "svelte";
import type { z } from "zod";
import type { AuthoringStatus } from "./autosave";
import type { AuthoringSession } from "./session";

let {
	session,
	collection,
	schema = null,
	onSaved,
	onDeleted,
	onCancel,
}: {
	/** Parent-owned session — EntryEditor does not dispose it. */
	session: AuthoringSession;
	collection: string;
	/** Live Zod from host-compiled editor configuration. */
	schema?: z.ZodType | null;
	onSaved?: (entry: ContentEntry) => void;
	onDeleted?: () => void;
	onCancel?: () => void;
} = $props();

/** Bumped on session notify so snapshot re-reads reactively. */
let version = $state(0);
let lastNotifiedSaved = $state.raw<ContentEntry | null>(null);

const snap = $derived.by(() => {
	void version;
	return session.getSnapshot();
});

/** Session-owned field context — capabilities do not change mid-session. */
const assetsContext = $derived.by(() => {
	void version;
	return session.assetsContext();
});

onMount(() => {
	return session.subscribe(() => {
		version += 1;
		const next = session.getSnapshot().lastSaved;
		if (next && next !== lastNotifiedSaved) {
			lastNotifiedSaved = next;
			onSaved?.(next);
		}
	});
});

function onFormChange(data: Record<string, unknown>) {
	session.handleChange(data);
}

/** Explicit Save — flush pending valid payload immediately. */
function saveNow(data: Record<string, unknown>) {
	session.handleChange(data);
	session.flushNow();
}

async function remove() {
	if (snap.creating || !snap.canDelete) return;
	const id = snap.entryId;
	if (!confirm(`Delete ${collection}/${id}?`)) return;
	const result = await session.deleteEntry();
	if (result.ok) onDeleted?.();
}

/** Open the real Astro site route for persisted content — no draft transport. */
function openPreview() {
	if (!snap.previewUrl) return;
	window.open(snap.previewUrl, "_blank", "noopener,noreferrer");
}

function statusLabel(status: AuthoringStatus): string | null {
	switch (status) {
		case "saving":
			return "saving";
		case "saved":
			return "saved";
		case "client_invalid":
			return "client-invalid";
		case "authoritative_error":
			return "authoritative-error";
		case "conflict":
			return "conflict";
		default:
			return null;
	}
}
</script>

<section>
	<p>
		<strong>Editor</strong>
		— {collection}/{snap.creating ? "(new)" : snap.entryId}
		{#if statusLabel(snap.saveStatus)}
			<span data-authoring-status={snap.saveStatus}
				>— {statusLabel(snap.saveStatus)}</span
			>
		{:else if snap.busy}
			<span>…busy</span>
		{/if}
	</p>

	{#if snap.creating}
		<p>
			<label>
				new id
				<input
					value={snap.entryId}
					placeholder="entry-id"
					oninput={(e) => session.setCreateId(e.currentTarget.value)}
				/>
			</label>
		</p>
	{/if}

	{#if snap.saveStatus === "client_invalid"}
		<p role="status">client-invalid — kept in browser form only (not written)</p>
	{:else if snap.saveStatus === "authoritative_error"}
		<p role="alert">authoritative-error: {snap.error}</p>
	{:else if snap.saveStatus === "conflict"}
		<p role="alert">conflict: {snap.error}</p>
		<p>
			<button
				type="button"
				disabled={snap.busy}
				onclick={() => void session.reload()}>Reload</button
			>
		</p>
	{:else if snap.error}
		<p role="alert">error: {snap.error}</p>
	{/if}
	{#if snap.issues}
		<details open>
			<summary>validation issues</summary>
			<pre>{JSON.stringify(snap.issues, null, 2)}</pre>
		</details>
	{/if}

	{#if schema}
		{#key `${collection}:${snap.creating ? "new" : snap.entryId}:${snap.formEpoch}`}
			<CmsForm
				title={`${collection} / ${snap.creating ? snap.entryId || "new" : snap.entryId}`}
				{schema}
				value={snap.formValue}
				{collection}
				entryId={snap.creating ? snap.entryId.trim() : snap.entryId}
				assets={assetsContext}
				onChange={onFormChange}
				onSubmit={(data) => saveNow(data)}
			/>
		{/key}
	{:else}
		<p>
			No editor schema for <code>{collection}</code> in host editor configuration.
		</p>
	{/if}

	<p>
		<button type="button" disabled={snap.busy} onclick={() => onCancel?.()}
			>back</button
		>
		{#if !snap.creating && snap.canDelete}
			<button type="button" disabled={snap.busy} onclick={() => void remove()}
				>delete</button
			>
		{/if}
		{#if snap.previewUrl}
			<button type="button" disabled={snap.busy} onclick={openPreview}
				>Open preview</button
			>
		{/if}
	</p>

	{#if snap.lastSaved}
		<details>
			<summary>last saved entry</summary>
			<pre>{JSON.stringify(snap.lastSaved, null, 2)}</pre>
		</details>
	{/if}
</section>
