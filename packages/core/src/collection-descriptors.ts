/**
 * Collection descriptors for the FS / protocol host, plus entry-id scanning.
 * Default hosts build descriptors from compiled IR (ADR-0019 / 0020).
 */
import path from "node:path";
import type { z } from "zod";
import { idFromRelPath } from "./path-resolve";
import type { Writer } from "./types";

/** Collection chrome for write-mode path / label / visibility. */
export type CollectionConfig = {
	label?: string;
	hidden?: boolean;
	pathTemplate?: string;
	base?: string;
	/** Reserved — not implemented in v1. */
	kind?: "singleton";
	extension?: "json";
};

/** One collection’s write-back descriptor (name, base, authoritative schema). */
export type CollectionDescriptor = {
	name: string;
	label?: string;
	schema: z.ZodType;
	config?: CollectionConfig;
	/** Entry directory relative to write-mode `root`. */
	base: string;
	loaderHint?: string;
	hidden?: boolean;
};

function normalizeFs(p: string): string {
	return path.resolve(p).replace(/\\/g, "/");
}

/**
 * FS-scan JSON entry ids under `baseDir` (`id` = relpath without extension).
 * Prefers listing via `writer.list` (works for memory + node writers).
 */
export async function scanEntryIds(
	writer: Writer,
	baseDir: string,
): Promise<string[]> {
	const root = normalizeFs(baseDir);
	const ids = new Set<string>();
	const seenDirs = new Set<string>();

	async function walk(dir: string, relPrefix: string): Promise<void> {
		const normalized = normalizeFs(dir);
		if (seenDirs.has(normalized)) return;
		seenDirs.add(normalized);

		let names: string[];
		try {
			names = await writer.list(normalized);
		} catch {
			return;
		}

		for (const name of names) {
			const rel = relPrefix ? `${relPrefix}/${name}` : name;
			const id = idFromRelPath(rel);
			if (id !== null) {
				ids.add(id);
				continue;
			}
			await walk(path.join(normalized, name), rel);
		}
	}

	await walk(root, "");
	return [...ids].sort();
}
