/**
 * PROTOTYPE / SPIKE — in-memory writer for tests / Pass 1 without disk.
 */
import type { Writer } from "./types";

export function memoryWriter(
	initial: Record<string, string> = {},
): Writer & { store: Map<string, string> } {
	const store = new Map(Object.entries(initial));

	return {
		store,
		async readText(path: string) {
			const v = store.get(path);
			if (v === undefined) throw new Error(`ENOENT: ${path}`);
			return v;
		},
		async writeText(path: string, contents: string) {
			store.set(path, contents);
		},
		async remove(path: string) {
			store.delete(path);
		},
		async list(dir: string) {
			const prefix = dir.replace(/\/+$/, "") + "/";
			const names = new Set<string>();
			for (const key of store.keys()) {
				if (key.startsWith(prefix)) {
					names.add(key.slice(prefix.length).split("/")[0]!);
				}
			}
			return [...names];
		},
	};
}
