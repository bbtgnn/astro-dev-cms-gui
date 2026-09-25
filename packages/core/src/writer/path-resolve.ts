/**
 * Id ↔ entry relpath helpers (ticket 11).
 * P1 still resolves via pathMap in write-mode; these helpers are the P2 seam.
 */
import { isAbsolute, join, resolve } from "pathe";

export type EntryExtension = "json";

export const DEFAULT_ENTRY_EXTENSION: EntryExtension = "json";

function normalizeFs(p: string): string {
	return resolve(p).replace(/\\/g, "/");
}

/** Refuse absolute ids, `..`, empty segments, and backslashes. */
export function assertSafeEntryId(id: string): void {
	if (!id || id.includes("\\") || id.startsWith("/") || isAbsolute(id)) {
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

export function entryRelPath(
	id: string,
	ext: EntryExtension = DEFAULT_ENTRY_EXTENSION,
): string {
	assertSafeEntryId(id);
	return `${id}.${ext}`;
}

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
	preferredExt?: EntryExtension;
	forCreate?: boolean;
};

export type ResolvedEntry = {
	absolutePath: string;
	ext: EntryExtension;
	created: boolean;
};

export async function resolveEntryPath(
	exists: (absolutePath: string) => Promise<boolean>,
	baseDir: string,
	id: string,
	options: ResolveEntryOptions = {},
): Promise<ResolvedEntry | null> {
	assertSafeEntryId(id);
	const preferred = options.preferredExt ?? DEFAULT_ENTRY_EXTENSION;
	const forCreate = options.forCreate ?? true;

	const abs = normalizeFs(join(baseDir, `${id}.${preferred}`));
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
