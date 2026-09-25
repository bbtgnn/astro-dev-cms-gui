/**
 * Collection descriptors for the FS / protocol host, plus entry-id scanning.
 * Default hosts build descriptors from compiled IR (ADR-0019 / 0020).
 */

import * as pathe from "pathe";
import type { z } from "zod";
import { normalizeFs } from "./path-normalize";
import { idFromRelPath } from "./path-resolve";
import type { Writer } from "./types";

export type CollectionConfig = {
	label?: string;
	hidden?: boolean;
	pathTemplate?: string;
	base?: string;
	/** Reserved — not implemented in v1. */
	kind?: "singleton";
	extension?: "json";
};

export type CollectionDescriptor = {
	name: string;
	label?: string;
	schema: z.ZodType;
	config?: CollectionConfig;
	base: string;
	loaderHint?: string;
	hidden?: boolean;
};

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
			await walk(pathe.join(normalized, name), rel);
		}
	}

	await walk(root, "");
	return [...ids].sort();
}
