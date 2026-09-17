<!--
  PROTOTYPE — entry editor: form shell + guarded upsert / delete via protocol client.
  Host injects the client; no Astro / Node / write-back imports (ADR-0008).
-->
<script lang="ts">
import {
	type ContentEntry,
	isCmsFetchError,
} from "@cms/crud/fetch-client";
import { type CmsAssetsFieldContext, CmsForm } from "@cms/form";
import { untrack } from "svelte";
import type { z } from "zod";
import type { AuthoringClient } from "./types";

let {
	client,
	collection,
	entryId,
	schema = null,
	value = {},
	creating = false,
	revision: revisionProp = null,
	canDelete = false,
	canUploadAssets = false,
	maxUploadBytes = undefined,
	previewUrl = null,
	onSaved,
	onDeleted,
	onCancel,
	onReload,
}: {
	client: AuthoringClient;
	collection: string;
	entryId: string;
	/** Live Zod from host-compiled editor configuration. */
	schema?: z.ZodType | null;
	value?: Record<string, unknown>;
	creating?: boolean;
	/** Opaque revision from loaded entry; null/absent when creating. */
	revision?: string | null;
	/** From protocol capabilities — hide delete when unsupported. */
	canDelete?: boolean;
	/** From protocol capabilities — disable image upload when unsupported. */
	canUploadAssets?: boolean;
	maxUploadBytes?: number;
	/**
	 * Site route for this entry after successful write-back (ADR-0013).
	 * Null/absent → no preview control. Never carries unsaved form state.
	 */
	previewUrl?: string | null;
	onSaved?: (entry: ContentEntry) => void;
	onDeleted?: () => void;
	onCancel?: () => void;
	onReload?: () => void;
} = $props();

/** Create-flow id field; default matches tracer pathMap `new-post`. */
let idDraft = $state("new-post");
/**
 * Local opaque revision; seeded from prop (parent remounts via `{#key}` on reload).
 * Updated after successful save.
 */
let revision = $state<string | null>(untrack(() => revisionProp));
let busy = $state(false);
let saveStatus = $state<
	"idle" | "saving" | "saved" | "validation_failed" | "conflict"
>("idle");
let error = $state<string | null>(null);
let issues = $state.raw<unknown>(null);
let lastSaved = $state.raw<ContentEntry | null>(null);

const assetsContext = $derived.by((): CmsAssetsFieldContext => {
	if (!canUploadAssets) {
		return { uploadEnabled: false };
	}
	return {
		uploadEnabled: true,
		maxUploadBytes,
		uploadImage: async (input) => {
			const result = await client.uploadImage(input);
			if (!result.ok) {
				return { ok: false, message: result.message };
			}
			return { ok: true, path: result.value.path };
		},
	};
});

function clearErrors() {
	error = null;
	issues = null;
}

async function save(data: Record<string, unknown>) {
	const id = creating ? idDraft.trim() : entryId;
	if (!id) {
		error = "Entry id is required";
		issues = null;
		saveStatus = "idle";
		return;
	}
	busy = true;
	saveStatus = "saving";
	clearErrors();
	try {
		const result = await client.upsertEntry({
			id,
			collection,
			data,
			expectedRevision: creating ? null : revision,
		});
		if (!result.ok) {
			error = result.message;
			issues = result.issues ?? null;
			if (result.code === "validation_failed") {
				saveStatus = "validation_failed";
			} else if (result.code === "conflict") {
				saveStatus = "conflict";
			} else {
				saveStatus = "idle";
			}
			return;
		}
		revision = result.value.revision;
		lastSaved = result.value;
		saveStatus = "saved";
		onSaved?.(result.value);
	} catch (e) {
		saveStatus = "idle";
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
	if (creating || !canDelete) return;
	if (!confirm(`Delete ${collection}/${entryId}?`)) return;
	busy = true;
	clearErrors();
	saveStatus = "idle";
	try {
		const result = await client.deleteEntry(collection, entryId);
		if (!result.ok) {
			error = `${result.code}: ${result.message}`;
			issues = null;
			return;
		}
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

/** Force invalid payload to demo authoritative validation_failed (posts title must be string). */
async function saveInvalid() {
	await save({
		title: 123,
		draft: false,
		body: "intentionally invalid title type",
		author: "ada",
		summary: { en: "x" },
	} as unknown as Record<string, unknown>);
}

/** Open the real Astro site route for persisted content — no draft transport. */
function openPreview() {
	if (!previewUrl) return;
	window.open(previewUrl, "_blank", "noopener,noreferrer");
}
</script>

<section>
	<p>
		<strong>Editor</strong>
		— {collection}/{creating ? "(new)" : entryId}
		{#if saveStatus === "saving"}
			<span>…saving</span>
		{:else if saveStatus === "saved"}
			<span>— saved</span>
		{:else if busy}
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

	{#if saveStatus === "validation_failed"}
		<p role="alert">authoritative validation failure: {error}</p>
	{:else if saveStatus === "conflict"}
		<p role="alert">conflict: {error}</p>
		<p>
			<button type="button" disabled={busy} onclick={() => onReload?.()}
				>Reload</button
			>
		</p>
	{:else if error}
		<p role="alert">error: {error}</p>
	{/if}
	{#if issues}
		<details open>
			<summary>validation issues</summary>
			<pre>{JSON.stringify(issues, null, 2)}</pre>
		</details>
	{/if}

	{#if schema}
		{#key `${collection}:${creating ? "new" : entryId}:${JSON.stringify(value)}`}
			<CmsForm
				title={`${collection} / ${creating ? idDraft || "new" : entryId}`}
				{schema}
				{value}
				{collection}
				entryId={creating ? idDraft.trim() : entryId}
				assets={assetsContext}
				onSubmit={(data) => void save(data)}
			/>
		{/key}
	{:else}
		<p>
			No editor schema for <code>{collection}</code> in host editor configuration.
		</p>
	{/if}

	<p>
		<button type="button" disabled={busy} onclick={() => onCancel?.()}
			>back</button
		>
		{#if !creating && canDelete}
			<button type="button" disabled={busy} onclick={() => void remove()}
				>delete</button
			>
		{/if}
		{#if previewUrl}
			<button type="button" disabled={busy} onclick={openPreview}
				>Open preview</button
			>
		{/if}
		<button type="button" disabled={busy} onclick={() => void saveInvalid()}
			>save invalid (expect validation_failed)</button
		>
	</p>

	{#if lastSaved}
		<details>
			<summary>last saved entry</summary>
			<pre>{JSON.stringify(lastSaved, null, 2)}</pre>
		</details>
	{/if}
</section>
