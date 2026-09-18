/**
 * Id ↔ entry relpath helpers (ticket 11).
 * P1 still resolves via pathMap in write-mode; these helpers are the P2 seam.
 */
import path from "node:path";

export type EntryExtension = "json";

export const DEFAULT_ENTRY_EXTENSION: EntryExtension = "json";

function normalizeFs(p: string): string {
	return path.resolve(p).replace(/\\/g, "/");
}

/** Refuse absolute ids, `..`, empty segments, and backslashes. */
export function assertSafeEntryId(id: string): void {
	if (!id || id.includes("\\") || id.startsWith("/") || path.isAbsolute(id)) {
		throw Object.assign(new Error(`Unsafe entry id: ${id}`), {
			status: 400,
			code: "UNSAFE_ID",
		});
	}
	const parts = id.split("/");
	if (parts.some((p) => !p || p === "." || p === "..")) {
		throw Object.assign(new Error(`Unsafe entry id: ${id}`), {
			status: 400,
			code: "UNSAFE_ID",
		});
	}
}

/** `id` → relative path under a collection base (`docs/intro` → `docs/intro.json`). */
export function entryRelPath(
	id: string,
	ext: EntryExtension = DEFAULT_ENTRY_EXTENSION,
): string {
	assertSafeEntryId(id);
	return `${id}.${ext}`;
}

/** Strip `.json`; returns null if not an entry path. */
export function idFromRelPath(relPath: string): string | null {
	const normalized = relPath.replace(/\\/g, "/");
	if (normalized.endsWith(".json")) return normalized.slice(0, -".json".length);
	return null;
}

/**
 * Minimal `{base}/{id}.{ext}` substitution only — no mini-language.
 * `base` may be empty (leading slash collapsed).
 */
export function applyPathTemplate(
	template: string,
	vars: { base: string; id: string; ext: string },
): string {
	const raw = template
		.replaceAll("{base}", vars.base)
		.replaceAll("{id}", vars.id)
		.replaceAll("{ext}", vars.ext);
	return raw.replace(/\/{2,}/g, "/").replace(/^\//, "");
}

export type ResolveEntryOptions = {
	/** Extension on create when missing. Default `json`. */
	preferredExt?: EntryExtension;
	/**
	 * When true (default), return the create path if the file does not exist.
	 * When false, return null if missing.
	 */
	forCreate?: boolean;
};

export type ResolvedEntry = {
	absolutePath: string;
	ext: EntryExtension;
	/** True when the entry file did not exist yet. */
	created: boolean;
};

/**
 * Resolve `(baseDir, id)` to an absolute JSON entry path.
 */
export async function resolveEntryPath(
	exists: (absolutePath: string) => Promise<boolean>,
	baseDir: string,
	id: string,
	options: ResolveEntryOptions = {},
): Promise<ResolvedEntry | null> {
	assertSafeEntryId(id);
	const preferred = options.preferredExt ?? DEFAULT_ENTRY_EXTENSION;
	const forCreate = options.forCreate ?? true;

	const abs = normalizeFs(path.join(baseDir, `${id}.${preferred}`));
	const present = await exists(abs);

	if (present) {
		return { absolutePath: abs, ext: preferred, created: false };
	}
	if (!forCreate) return null;

	return {
		absolutePath: abs,
		ext: preferred,
		created: true,
	};
}

/** Writer-backed exists probe (ENOENT → false). */
export function writerExists(
	readText: (path: string) => Promise<string>,
): (absolutePath: string) => Promise<boolean> {
	return async (absolutePath) => {
		try {
			await readText(absolutePath);
			return true;
		} catch {
			return false;
		}
	};
}
