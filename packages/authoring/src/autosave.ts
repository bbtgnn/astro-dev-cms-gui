/**
 * Debounced, coalesced autosave for guarded protocol write-back (issue #19).
 * Pure orchestration — injectable timers and save seam for contract checks.
 *
 * Invalid browser values stay local: client-invalid never calls `save`.
 * One in-flight write; latest valid payload is queued; stale responses ignored.
 */

import type { ContentEntry } from "@cms/crud/fetch-client";

/** Distinct authoring UI states for autosave (ADR-0014). */
export type AuthoringStatus =
	| "idle"
	| "saving"
	| "saved"
	| "client_invalid"
	| "authoritative_error"
	| "conflict";

export type AutosaveSaveResult =
	| { ok: true; entry: ContentEntry }
	| {
			ok: false;
			code: "validation_failed" | "conflict" | string;
			message: string;
			issues?: unknown;
	  };

export type AutosaveTimers = {
	setTimer: (fn: () => void, ms: number) => unknown;
	clearTimer: (id: unknown) => void;
};

export type AutosaveControllerOptions = {
	debounceMs: number;
	/** Client-side validity gate — false → client_invalid, no write-back. */
	isClientValid: (data: Record<string, unknown>) => boolean;
	/**
	 * Guarded write. Caller supplies current expectedRevision at call time
	 * (controller does not store revision; EntryEditor owns that).
	 */
	save: (data: Record<string, unknown>) => Promise<AutosaveSaveResult>;
	onStatus: (status: AuthoringStatus) => void;
	onSaved?: (entry: ContentEntry) => void;
	onError?: (detail: {
		code: string;
		message: string;
		issues?: unknown;
	}) => void;
	timers?: AutosaveTimers;
};

const defaultTimers: AutosaveTimers = {
	setTimer: (fn, ms) => setTimeout(fn, ms),
	clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export type AutosaveController = {
	/** Form changed — validates, updates status, schedules coalesced write. */
	handleChange: (data: Record<string, unknown>) => void;
	/** Flush immediately (explicit Save). Skips if client-invalid / empty queue. */
	flushNow: () => void;
	/** Cancel timers; in-flight responses become stale. */
	dispose: () => void;
	/** Test / debug: whether a write is in flight. */
	isInFlight: () => boolean;
};

/**
 * Create an autosave controller.
 * Call `handleChange` only for author edits (not the initial form bind).
 */
export function createAutosaveController(
	options: AutosaveControllerOptions,
): AutosaveController {
	const timers = options.timers ?? defaultTimers;
	let disposed = false;
	let timerId: unknown = null;
	let inFlight = false;
	let queued: Record<string, unknown> | null = null;
	/** Bumps on every handleChange; stale responses skip UI status flips. */
	let generation = 0;

	function clearDebounce() {
		if (timerId != null) {
			timers.clearTimer(timerId);
			timerId = null;
		}
	}

	function scheduleDebounce() {
		clearDebounce();
		timerId = timers.setTimer(() => {
			timerId = null;
			void flush();
		}, options.debounceMs);
	}

	async function flush() {
		if (disposed || inFlight) return;
		if (queued == null) return;

		const data = queued;
		queued = null;
		const myGeneration = generation;
		inFlight = true;
		options.onStatus("saving");

		let result: AutosaveSaveResult;
		try {
			result = await options.save(data);
		} catch (e) {
			inFlight = false;
			if (disposed || myGeneration !== generation) {
				if (!disposed && queued != null) void flush();
				return;
			}
			options.onStatus("idle");
			options.onError?.({
				code: "error",
				message: e instanceof Error ? e.message : String(e),
			});
			return;
		}

		inFlight = false;
		if (disposed) return;

		if (!result.ok) {
			// Conflicts always surface — canonical was not replaced.
			if (result.code === "conflict") {
				options.onStatus("conflict");
				options.onError?.({
					code: result.code,
					message: result.message,
					issues: result.issues,
				});
				return;
			}
			if (myGeneration !== generation) {
				if (queued != null) void flush();
				return;
			}
			if (result.code === "validation_failed") {
				options.onStatus("authoritative_error");
			} else {
				options.onStatus("idle");
			}
			options.onError?.({
				code: result.code,
				message: result.message,
				issues: result.issues,
			});
			return;
		}

		// Always take successful revision for the next guarded write.
		options.onSaved?.(result.entry);

		if (queued != null) {
			void flush();
			return;
		}

		if (myGeneration === generation) {
			options.onStatus("saved");
		}
		// If superseded with an empty queue, status was already updated
		// (e.g. client_invalid) while the write was in flight.
	}

	function handleChange(data: Record<string, unknown>) {
		if (disposed) return;
		generation += 1;

		if (!options.isClientValid(data)) {
			clearDebounce();
			queued = null;
			options.onStatus("client_invalid");
			return;
		}

		queued = data;
		// Do not leave "saved" visible while a newer write is only pending.
		options.onStatus("idle");
		scheduleDebounce();
	}

	function flushNow() {
		if (disposed) return;
		clearDebounce();
		void flush();
	}

	function dispose() {
		disposed = true;
		clearDebounce();
		queued = null;
		generation += 1;
	}

	return {
		handleChange,
		flushNow,
		dispose,
		isInFlight: () => inFlight,
	};
}
