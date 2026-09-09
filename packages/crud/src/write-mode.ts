/**
 * PROTOTYPE / SPIKE — createWriteMode with allowlisted paths.
 */
import path from "node:path";
import { z } from "zod";
import type { ContentEntry, CreateWriteModeOptions, WriteMode } from "./types";

function normalizeFs(p: string): string {
	return path.resolve(p).replace(/\\/g, "/");
}

function joinRoot(root: string, rel: string): string {
	return normalizeFs(path.join(root, rel));
}

function isPathAllowed(
	absolutePath: string,
	root: string,
	allowPaths: string[],
): boolean {
	const resolved = normalizeFs(absolutePath);
	const normalizedRoot = normalizeFs(root);

	for (const allowed of allowPaths) {
		const prefix = allowed.startsWith("/")
			? normalizeFs(allowed)
			: joinRoot(normalizedRoot, allowed);
		if (resolved === prefix || resolved.startsWith(`${prefix}/`)) {
			return true;
		}
	}
	return false;
}

const passthrough = z.record(z.string(), z.unknown());

export function createWriteMode(options: CreateWriteModeOptions): WriteMode {
	const {
		root,
		allowPaths,
		writer,
		pathMap = {},
		schemas = {},
		fakeCatalog = {},
	} = options;

	const catalog: Record<string, ContentEntry[]> = structuredClone(fakeCatalog);

	function resolvePath(collection: string, id: string): string {
		const rel = pathMap[collection]?.[id];
		if (!rel) {
			throw Object.assign(new Error(`No path mapped for ${collection}/${id}`), {
				status: 404,
			});
		}
		return joinRoot(root, rel);
	}

	function assertAllowed(absolutePath: string): void {
		if (!isPathAllowed(absolutePath, root, allowPaths)) {
			throw Object.assign(new Error(`Path not allowlisted: ${absolutePath}`), {
				status: 403,
				code: "PATH_NOT_ALLOWED",
			});
		}
	}

	return {
		async listCollections() {
			const names = new Set([...Object.keys(catalog), ...Object.keys(pathMap)]);
			return [...names].sort().map((name) => ({ name }));
		},

		async listEntries(collection: string) {
			const fromCatalog = catalog[collection] ?? [];
			const fromMap = Object.keys(pathMap[collection] ?? {});
			const ids = new Set([...fromCatalog.map((e) => e.id), ...fromMap]);
			return [...ids].sort().map((id) => ({ id }));
		},

		async getEntry(collection: string, id: string) {
			const hit = (catalog[collection] ?? []).find((e) => e.id === id);
			if (hit) return hit;

			if (!pathMap[collection]?.[id]) return null;

			const absolutePath = resolvePath(collection, id);
			assertAllowed(absolutePath);
			try {
				const raw = await writer.readText(absolutePath);
				const data = JSON.parse(raw) as Record<string, unknown>;
				return { id, collection, data };
			} catch {
				return null;
			}
		},

		async upsertEntry(entry: ContentEntry) {
			const schema = schemas[entry.collection] ?? passthrough;
			const parsed = schema.safeParse(entry.data);
			if (!parsed.success) {
				throw Object.assign(new Error("Validation failed"), {
					status: 400,
					issues: parsed.error.issues,
				});
			}

			const absolutePath = resolvePath(entry.collection, entry.id);
			assertAllowed(absolutePath);

			const next: ContentEntry = {
				id: entry.id,
				collection: entry.collection,
				data: parsed.data as Record<string, unknown>,
			};

			await writer.writeText(
				absolutePath,
				`${JSON.stringify(next.data, null, 2)}\n`,
			);

			let list = catalog[entry.collection];
			if (!list) {
				list = [];
				catalog[entry.collection] = list;
			}
			const idx = list.findIndex((e) => e.id === entry.id);
			if (idx >= 0) list[idx] = next;
			else list.push(next);

			return next;
		},

		async deleteEntry(collection: string, id: string) {
			const absolutePath = resolvePath(collection, id);
			assertAllowed(absolutePath);
			await writer.remove(absolutePath);
			catalog[collection] = (catalog[collection] ?? []).filter(
				(e) => e.id !== id,
			);
		},
	};
}
