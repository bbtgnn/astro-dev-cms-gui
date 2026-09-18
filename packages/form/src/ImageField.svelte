<!--
  Custom sjsf textWidget: image picker → protocol client uploadImage → path string.
  Needs cms.entry + cms.assets context from CmsForm (collection, id, capability).
-->
<script lang="ts">
	import type { ComponentProps } from "@sjsf/form";
	import { getFormContext, uiTitleOption } from "@sjsf/form";
	import { getContext } from "svelte";

	export type CmsEntryContext = {
		collection: string;
		id: string;
	};

	/** Injected upload seam — no hard-coded transport URL (ADR-0005 / ADR-0008). */
	export type CmsAssetsFieldContext = {
		/** From protocol capabilities — false → disabled, no network calls. */
		uploadEnabled: boolean;
		maxUploadBytes?: number;
		uploadImage?: (input: {
			file: Blob;
			collection: string;
			id: string;
			name?: string;
			filename?: string;
		}) => Promise<{ ok: true; path: string } | { ok: false; message: string }>;
	};

	const ctx = getFormContext();
	const entryCtx = getContext<CmsEntryContext>("cms.entry");
	const assetsCtx = getContext<CmsAssetsFieldContext | null>("cms.assets");

	let {
		config,
		value = $bindable(),
	}: ComponentProps["textWidget"] = $props();

	let busy = $state(false);
	let error = $state<string | null>(null);

	const uploadEnabled = $derived(assetsCtx?.uploadEnabled === true);
	const hasEntry = $derived(
		Boolean(entryCtx?.collection && entryCtx?.id),
	);
	const canUpload = $derived(uploadEnabled && hasEntry && !busy);

	function uiOptions(): Record<string, unknown> {
		return (config.uiSchema?.["ui:options"] ?? {}) as Record<string, unknown>;
	}

	function folderName(): string {
		const fromUi = uiOptions().folder;
		if (typeof fromUi === "string" && fromUi.length > 0) return fromUi;
		const path = String(config.path ?? "cover");
		const leaf = path.split("/").filter(Boolean).pop();
		return leaf && /^[a-zA-Z0-9_-]+$/.test(leaf) ? leaf : "cover";
	}

	const title = $derived(uiTitleOption(ctx, config.uiSchema) ?? "Image");

	async function onFile(files: FileList | null) {
		const file = files?.[0];
		if (!file) return;
		if (!uploadEnabled || !assetsCtx?.uploadImage) {
			error = "Image upload is not available on this backend";
			return;
		}
		if (!entryCtx?.collection || !entryCtx?.id) {
			error = "Missing entry context (collection/id) for image upload";
			return;
		}
		const maxBytes = assetsCtx.maxUploadBytes;
		if (maxBytes != null && file.size > maxBytes) {
			error = `File exceeds max upload size (${maxBytes} bytes)`;
			return;
		}
		busy = true;
		error = null;
		try {
			const result = await assetsCtx.uploadImage({
				file,
				collection: entryCtx.collection,
				id: entryCtx.id,
				name: folderName(),
				filename: file.name,
			});
			if (!result.ok) {
				error = result.message;
				return;
			}
			value = result.path;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}
</script>

<div class="cms-image-field">
	<label class="cms-image-label">
		<span class="sjsf-label">{title}</span>
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp"
			disabled={!canUpload}
			onchange={(e) => void onFile(e.currentTarget.files)}
		/>
	</label>
	{#if value}
		<p class="cms-image-path"><code>{value}</code></p>
	{/if}
	{#if busy}
		<p class="cms-image-status">uploading…</p>
	{/if}
	{#if error}
		<p class="cms-image-error" role="alert">{error}</p>
	{/if}
	{#if !uploadEnabled}
		<p class="cms-image-hint">Image upload is unavailable on this backend.</p>
	{:else if !hasEntry}
		<p class="cms-image-hint">Save/open an entry id before uploading.</p>
	{/if}
</div>

<style>
	.cms-image-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.cms-image-label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.cms-image-path,
	.cms-image-status,
	.cms-image-hint {
		margin: 0;
		font-size: 0.9em;
	}

	.cms-image-error {
		margin: 0;
		color: #b00020;
	}
</style>
