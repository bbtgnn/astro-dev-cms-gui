/**
 * Authoring session against AuthoringClient (ADR-0008 / 0014).
 * Owns statuses, guarded write-back, preview eligibility, and remount rules.
 * Debounce/coalesce lives behind an internal autosave seam.
 * Draft-write eligibility is an injected opaque predicate (not Ajv/Zod here);
 * create mode also requires a non-empty create-id before write-back.
 */
import type { CmsCapabilities, ContentEntry } from "@cms/core/fetch-client";
import {
	type AuthoringStatus,
	type AutosaveTimers,
	createAutosaveController,
} from "./autosave";
import type { CmsAssetsFieldContext } from "./form";
import type { AuthoringClient, GetPreviewUrl } from "./types";

const DEFAULT_DEBOUNCE_MS = 400;

export type AuthoringSessionMode =
	| { kind: "edit"; entry: ContentEntry }
	| { kind: "create" };

export type AuthoringSessionOptions = {
	client: AuthoringClient;
	collection: string;
	mode: AuthoringSessionMode;
	/**
	 * Opaque draft-write gate (ADR-0014). Production: `createDraftEligibility`
	 * over the collection form-model JSON Schema. Host Zod stays authoritative.
	 */
	isClientValid: (data: Record<string, unknown>) => boolean;
	capabilities?: CmsCapabilities | null;
	getPreviewUrl?: GetPreviewUrl;
	debounceMs?: number;
	timers?: AutosaveTimers;
};

export type AuthoringSessionSnapshot = {
	creating: boolean;
	entryId: string;
	revision: string | null;
	/** Canonical form seed — update only on remount (formEpoch change). */
	formValue: Record<string, unknown>;
	saveStatus: AuthoringStatus;
	error: string | null;
	issues: unknown | null;
	busy: boolean;
	canDelete: boolean;
	canUploadAssets: boolean;
	maxUploadBytes: number | undefined;
	/** Site URL only after successful write-back for the current entry id. */
	previewUrl: string | null;
	/**
	 * Bumps when the form shell must remount (create→edit, conflict reload).
	 * Successful edit autosave does not bump.
	 */
	formEpoch: number;
	lastSaved: ContentEntry | null;
};

export type AuthoringSession = {
	getSnapshot: () => AuthoringSessionSnapshot;
	subscribe: (listener: () => void) => () => void;
	setCreateId: (id: string) => void;
	handleChange: (data: Record<string, unknown>) => void;
	flushNow: () => void;
	deleteEntry: () => Promise<{ ok: true } | { ok: false; message: string }>;
	reload: () => Promise<void>;
	/**
	 * Authoring-facing asset upload for the form shell.
	 * File → field path | message; protocol bytes/FormData/Sharp stay behind the client.
	 */
	assetsContext: () => CmsAssetsFieldContext;
	dispose: () => void;
};

function resolvePreviewUrl(
	getPreviewUrl: GetPreviewUrl | undefined,
	collection: string,
	id: string,
	eligibleId: string | null,
): string | null {
	if (!getPreviewUrl || eligibleId !== id || !id) return null;
	const url = getPreviewUrl(collection, id);
	if (typeof url !== "string") return null;
	const trimmed = url.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function createAuthoringSession(
	options: AuthoringSessionOptions,
): AuthoringSession {
	const capabilities = options.capabilities ?? null;
	const canDelete = capabilities?.deleteEntry === true;
	const canUploadAssets = capabilities?.assets?.uploadImage === true;
	const maxUploadBytes = capabilities?.assets?.maxUploadBytes;

	let creating = options.mode.kind === "create";
	let entryId = options.mode.kind === "edit" ? options.mode.entry.id : "";
	let revision: string | null =
		options.mode.kind === "edit" ? options.mode.entry.revision : null;
	let formValue: Record<string, unknown> =
		options.mode.kind === "edit" ? { ...options.mode.entry.data } : {};
	/** Last form draft seen by the session — remount seed stays on `formValue`. */
	let lastDraftData: Record<string, unknown> = { ...formValue };
	let createIdDraft = "";
	let saveStatus: AuthoringStatus = "idle";
	let error: string | null = null;
	let issues: unknown | null = null;
	let deleteBusy = false;
	let formEpoch = 0;
	let previewEligibleId: string | null = null;
	let lastSaved: ContentEntry | null = null;

	const listeners = new Set<() => void>();

	function notify() {
		for (const listener of listeners) listener();
	}

	function clearErrors() {
		error = null;
		issues = null;
	}

	function getSnapshot(): AuthoringSessionSnapshot {
		const id = creating ? createIdDraft.trim() : entryId;
		return {
			creating,
			entryId: creating ? createIdDraft : entryId,
			revision,
			formValue,
			saveStatus,
			error,
			issues,
			busy: saveStatus === "saving" || deleteBusy,
			canDelete,
			canUploadAssets,
			maxUploadBytes,
			previewUrl: resolvePreviewUrl(
				options.getPreviewUrl,
				options.collection,
				id,
				previewEligibleId,
			),
			formEpoch,
			lastSaved,
		};
	}

	function isClientValid(data: Record<string, unknown>): boolean {
		if (creating && !createIdDraft.trim()) return false;
		return options.isClientValid(data);
	}

	async function writeBack(
		data: Record<string, unknown>,
	): Promise<
		| { ok: true; entry: ContentEntry }
		| { ok: false; code: string; message: string; issues?: unknown }
	> {
		const id = creating ? createIdDraft.trim() : entryId;
		if (!id) {
			return { ok: false, code: "error", message: "Entry id is required" };
		}
		const result = await options.client.upsertEntry({
			id,
			collection: options.collection,
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
		debounceMs: options.debounceMs ?? DEFAULT_DEBOUNCE_MS,
		timers: options.timers,
		isClientValid,
		save: writeBack,
		onStatus: (status) => {
			saveStatus = status;
			if (
				status === "saving" ||
				status === "client_invalid" ||
				status === "saved"
			) {
				clearErrors();
			}
			notify();
		},
		onSaved: (entry) => {
			const wasCreating = creating;
			revision = entry.revision;
			lastSaved = entry;
			previewEligibleId = entry.id;
			if (wasCreating) {
				creating = false;
				entryId = entry.id;
				createIdDraft = entry.id;
				formValue = { ...entry.data };
				lastDraftData = { ...entry.data };
				formEpoch += 1;
			}
			notify();
		},
		onError: (detail) => {
			error = detail.message;
			issues = detail.issues ?? null;
			notify();
		},
	});

	return {
		getSnapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		setCreateId(id) {
			if (!creating) return;
			createIdDraft = id;
			// Re-run the form-edit path so create-id alone can unlock write-back.
			autosave.handleChange(lastDraftData);
		},
		handleChange(data) {
			lastDraftData = data;
			autosave.handleChange(data);
		},
		flushNow() {
			autosave.flushNow();
		},
		async deleteEntry() {
			if (creating || !canDelete || !entryId) {
				return { ok: false, message: "Delete is not available" };
			}
			deleteBusy = true;
			clearErrors();
			saveStatus = "idle";
			notify();
			try {
				const result = await options.client.deleteEntry(
					options.collection,
					entryId,
				);
				if (!result.ok) {
					error = `${result.code}: ${result.message}`;
					issues = null;
					notify();
					return { ok: false, message: error };
				}
				return { ok: true };
			} finally {
				deleteBusy = false;
				notify();
			}
		},
		async reload() {
			if (creating || !entryId) return;
			const result = await options.client.getEntry(options.collection, entryId);
			if (!result.ok) {
				error = `${result.code}: ${result.message}`;
				notify();
				return;
			}
			revision = result.value.revision;
			formValue = { ...result.value.data };
			lastDraftData = { ...result.value.data };
			entryId = result.value.id;
			previewEligibleId = null;
			saveStatus = "idle";
			clearErrors();
			formEpoch += 1;
			notify();
		},
		assetsContext(): CmsAssetsFieldContext {
			if (!canUploadAssets) {
				return { uploadEnabled: false };
			}
			return {
				uploadEnabled: true,
				maxUploadBytes,
				uploadImage: async (input) => {
					const result = await options.client.uploadImage(input);
					if (!result.ok) {
						return { ok: false, message: result.message };
					}
					return { ok: true, path: result.value.path };
				},
			};
		},
		dispose() {
			autosave.dispose();
			listeners.clear();
		},
	};
}
