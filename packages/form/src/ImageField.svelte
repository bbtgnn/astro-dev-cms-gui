<!--
  Custom sjsf textWidget: image picker → POST /_cms/api/images → path string.
  Needs cms.entry context from CmsForm (collection + id).
-->
<script lang="ts">
	import type { ComponentProps } from "@sjsf/form";
	import { getFormContext, uiTitleOption } from "@sjsf/form";
	import { getContext } from "svelte";

	export type CmsEntryContext = {
		collection: string;
		id: string;
	};

	const ctx = getFormContext();
	const entryCtx = getContext<CmsEntryContext>("cms.entry");

	let {
		config,
		value = $bindable(),
	}: ComponentProps["textWidget"] = $props();

	let busy = $state(false);
	let error = $state<string | null>(null);

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

	function widths(): number[] | undefined {
		const fromUi = uiOptions().widths;
		if (Array.isArray(fromUi) && fromUi.every((n) => typeof n === "number")) {
			return fromUi as number[];
		}
		return undefined;
	}

	function quality(): number | undefined {
		const fromUi = uiOptions().quality;
		return typeof fromUi === "number" ? fromUi : undefined;
	}

	const title = $derived(uiTitleOption(ctx, config.uiSchema) ?? "Image");

	async function uploadImage(file: File) {
		const body = new FormData();
		body.append("file", file, file.name);
		body.append("collection", entryCtx.collection);
		body.append("id", entryCtx.id);
		body.append("name", folderName());
		const w = widths();
		if (w) body.append("widths", JSON.stringify(w));
		const q = quality();
		if (q != null) body.append("quality", String(q));

		const res = await fetch("/_cms/api/images", {
			method: "POST",
			headers: { accept: "application/json" },
			body,
		});
		const text = await res.text();
		let parsed: { path?: string; error?: string } = {};
		try {
			parsed = JSON.parse(text) as { path?: string; error?: string };
		} catch {
			parsed = {};
		}
		if (!res.ok) {
			throw new Error(parsed.error ?? `${res.status} ${res.statusText}`);
		}
		if (!parsed.path) throw new Error("Upload response missing path");
		return parsed.path;
	}

	async function onFile(files: FileList | null) {
		const file = files?.[0];
		if (!file) return;
		if (!entryCtx?.collection || !entryCtx?.id) {
			error = "Missing entry context (collection/id) for image upload";
			return;
		}
		busy = true;
		error = null;
		try {
			value = await uploadImage(file);
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
			disabled={busy || !entryCtx?.id}
			onchange={(e) => void onFile(e.currentTarget.files)}
		/>
	</label>
	{#if value}
		<p class="cms-image-path"><code>{value}</code></p>
	{/if}
	{#if busy}
		<p class="cms-image-status">converting…</p>
	{/if}
	{#if error}
		<p class="cms-image-error" role="alert">{error}</p>
	{/if}
	{#if !entryCtx?.id}
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
