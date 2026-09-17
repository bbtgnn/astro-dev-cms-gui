<!--
  PROTOTYPE — entry editor: form shell + debounced guarded autosave via protocol.
  Host injects the client; no Astro / Node / write-back imports (ADR-0008).
  Invalid values stay in browser form state only (ADR-0014); no reload recovery (#10).
-->
<script lang="ts">
import {
	type ContentEntry,
	isCmsFetchError,
} from "@cms/crud/fetch-client";
import { type CmsAssetsFieldContext, CmsForm } from "@cms/form";
import { onDestroy, untrack } from "svelte";
import type { z } from "zod";
import {
	type AuthoringStatus,
	createAutosaveController,
} from "./autosave";
import type { AuthoringClient } from "./types";

const AUTOSAVE_DEBOUNCE_MS = 400;

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

/** Create-flow id field — host/pathMap defaults stay out of this package. */
let idDraft = $state("");
/**
 * Local opaque revision; seeded from prop (parent remounts via mount key on reload).
 * Updated after every successful write-back for the next guarded write.
 */
let revision = $state<string | null>(untrack(() => revisionProp));
let busy = $state(false);
let deleteBusy = $state(false);
let saveStatus = $state<AuthoringStatus>("idle");
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

function isClientValid(data: Record<string, unknown>): boolean {
	if (creating && !idDraft.trim()) return false;
	if (!schema) return true;
	return schema.safeParse(data).success;
}

async function writeBack(
	data: Record<string, unknown>,
): Promise<
	| { ok: true; entry: ContentEntry }
	| {
			ok: false;
			code: string;
			message: string;
			issues?: unknown;
	  }
> {
	const id = creating ? idDraft.trim() : entryId;
	if (!id) {
		return { ok: false, code: "error", message: "Entry id is required" };
	}
	const result = await client.upsertEntry({
		id,
		collection,
		data,
		expectedRevision: creating ? null : revision,
	});
	if (!result.ok) {
		return {
			ok: false,
			code: result.code,
			message: result.message,
			issues: result.issues,
		};
	}
	return { ok: true, entry: result.value };
}

const autosave = createAutosaveController({
	debounceMs: AUTOSAVE_DEBOUNCE_MS,
	isClientValid,
	save: writeBack,
	onStatus: (status) => {
		saveStatus = status;
		busy = status === "saving" || deleteBusy;
		if (
			status === "saving" ||
			status === "client_invalid" ||
			status === "saved"
		) {
			clearErrors();
		}
	},
	onSaved: (entry) => {
		revision = entry.revision;
		lastSaved = entry;
		onSaved?.(entry);
	},
	onError: (detail) => {
		error = detail.message;
		issues = detail.issues ?? null;
	},
});

onDestroy(() => {
	autosave.dispose();
});

function onFormChange(data: Record<string, unknown>) {
	autosave.handleChange(data);
}

/** Explicit Save — flush pending valid payload immediately. */
function saveNow(data: Record<string, unknown>) {
	autosave.handleChange(data);
	autosave.flushNow();
}

async function remove() {
	if (creating || !canDelete) return;
	if (!confirm(`Delete ${collection}/${entryId}?`)) return;
	deleteBusy = true;
	busy = saveStatus === "saving" || deleteBusy;
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
		deleteBusy = false;
		busy = false;
	}
}

/** Open the real Astro site route for persisted content — no draft transport. */
function openPreview() {
	if (!previewUrl) return;
	window.open(previewUrl, "_blank", "noopener,noreferrer");
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
		— {collection}/{creating ? "(new)" : entryId}
		{#if statusLabel(saveStatus)}
			<span data-authoring-status={saveStatus}>— {statusLabel(saveStatus)}</span>
		{:else if busy}
			<span>…busy</span>
		{/if}
	</p>

	{#if creating}
		<p>
			<label>
				new id
				<input bind:value={idDraft} placeholder="entry-id" />
			</label>
		</p>
	{/if}

	{#if saveStatus === "client_invalid"}
		<p role="status">client-invalid — kept in browser form only (not written)</p>
	{:else if saveStatus === "authoritative_error"}
		<p role="alert">authoritative-error: {error}</p>
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
		{#key `${collection}:${creating ? "new" : entryId}`}
			<CmsForm
				title={`${collection} / ${creating ? idDraft || "new" : entryId}`}
				{schema}
				{value}
				{collection}
				entryId={creating ? idDraft.trim() : entryId}
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
	</p>

	{#if lastSaved}
		<details>
			<summary>last saved entry</summary>
			<pre>{JSON.stringify(lastSaved, null, 2)}</pre>
		</details>
	{/if}
</section>
