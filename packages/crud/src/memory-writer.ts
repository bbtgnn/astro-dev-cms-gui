/**
 * PROTOTYPE / SPIKE — in-memory writer for tests / Pass 1 without disk.
 */
import type { Writer } from "./types";

type StoreValue = string | Uint8Array;

export function memoryWriter(
	initial: Record<string, string> = {},
): Writer & { store: Map<string, StoreValue> } {
	const store = new Map<string, StoreValue>(Object.entries(initial));

	return {
		store,
		async readText(path: string) {
			const v = store.get(path);
			if (v === undefined) throw new Error(`ENOENT: ${path}`);
			if (typeof v !== "string") {
				throw new Error(`EISDIR-or-binary: ${path}`);
			}
			return v;
		},
		async writeText(path: string, contents: string) {
			store.set(path, contents);
		},
		async readBytes(path: string) {
			const v = store.get(path);
			if (v === undefined) throw new Error(`ENOENT: ${path}`);
			if (typeof v === "string") {
				return new TextEncoder().encode(v);
			}
			return v;
		},
		async writeBytes(path: string, contents: Uint8Array) {
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
