/**
 * PROTOTYPE / SPIKE — createWriteMode with allowlisted paths.
 * P2: prefer discovered collections (base + YAML helpers) over fakeCatalog/pathMap.
 */
import path from "node:path";
import { z } from "zod";
import type { DiscoveredCollection } from "./discovery";
import { scanYamlEntryIds } from "./discovery";
import { parseEntryFile, serializeEntryFile } from "./entry-file";
import {
	applyPathTemplate,
	assertNoYamlExtCollision,
	assertSafeEntryId,
	DEFAULT_YAML_EXTENSION,
	resolveYamlEntryPath,
	writerExists,
} from "./path-resolve";
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
		collections = [],
		entryIndex = {},
		pathMap = {},
		schemas: schemaOverrides = {},
		fakeCatalog = {},
	} = options;

	const byName = new Map<string, DiscoveredCollection>(
		collections.map((c) => [c.name, c]),
	);
	const schemas: Record<string, z.ZodType> = { ...schemaOverrides };
	for (const c of collections) {
		if (!schemas[c.name]) schemas[c.name] = c.schema;
	}

	const catalog: Record<string, ContentEntry[]> = structuredClone(fakeCatalog);
	const exists = writerExists((p) => writer.readText(p));
	const useDiscovery = collections.length > 0;

	function assertAllowed(absolutePath: string): void {
		if (!isPathAllowed(absolutePath, root, allowPaths)) {
			throw Object.assign(new Error(`Path not allowlisted: ${absolutePath}`), {
				status: 403,
				code: "PATH_NOT_ALLOWED",
			});
		}
	}

	async function resolvePath(
		collection: string,
		id: string,
		forCreate: boolean,
	): Promise<string> {
		const mapped = pathMap[collection]?.[id];
		if (mapped) {
			return joinRoot(root, mapped);
		}

		const discovered = byName.get(collection);
		if (discovered) {
			assertSafeEntryId(id);
			const baseRel = discovered.config?.base ?? discovered.base;
			const baseAbs = joinRoot(root, baseRel);
			const preferred = discovered.config?.extension ?? DEFAULT_YAML_EXTENSION;

			if (discovered.config?.pathTemplate) {
				const rel = applyPathTemplate(discovered.config.pathTemplate, {
					base: baseRel,
					id,
					ext: preferred,
				});
				return joinRoot(root, rel);
			}

			const resolved = await resolveYamlEntryPath(exists, baseAbs, id, {
				preferredExt: preferred,
				forCreate,
			});
			if (!resolved) {
				throw Object.assign(
					new Error(`No path mapped for ${collection}/${id}`),
					{ status: 404 },
				);
			}
			return resolved.absolutePath;
		}

		throw Object.assign(new Error(`No path mapped for ${collection}/${id}`), {
			status: 404,
		});
	}

	return {
		async listCollections() {
			if (useDiscovery) {
				return collections
					.filter((c) => !c.hidden && !c.config?.hidden)
					.map((c) => ({
						name: c.name,
						label: c.label ?? c.config?.label,
						loaderHint: c.loaderHint,
					}));
			}
			const names = new Set([...Object.keys(catalog), ...Object.keys(pathMap)]);
			return [...names].sort().map((name) => ({ name }));
		},

		async listEntries(collection: string) {
			if (useDiscovery) {
				const discovered = byName.get(collection);
				if (!discovered) return [];
				const indexed = entryIndex[collection];
				if (indexed) {
					return [...indexed].sort().map((id) => ({ id }));
				}
				const baseAbs = joinRoot(
					root,
					discovered.config?.base ?? discovered.base,
				);
				const ids = await scanYamlEntryIds(writer, baseAbs);
				return ids.map((id) => ({ id }));
			}

			const fromCatalog = catalog[collection] ?? [];
			const fromMap = Object.keys(pathMap[collection] ?? {});
			const ids = new Set([...fromCatalog.map((e) => e.id), ...fromMap]);
			return [...ids].sort().map((id) => ({ id }));
		},

		async getEntry(collection: string, id: string) {
			if (!useDiscovery) {
				const hit = (catalog[collection] ?? []).find((e) => e.id === id);
				if (hit) return hit;
				if (!pathMap[collection]?.[id]) return null;
			} else if (!byName.has(collection) && !pathMap[collection]?.[id]) {
				return null;
			}

			let absolutePath: string;
			try {
				absolutePath = await resolvePath(collection, id, false);
			} catch (err) {
				const e = err as { status?: number };
				if (e.status === 404) return null;
				throw err;
			}

			assertAllowed(absolutePath);
			try {
				await assertNoYamlExtCollision(exists, absolutePath);
				const raw = await writer.readText(absolutePath);
				const data = parseEntryFile(raw);
				return { id, collection, data };
			} catch (err) {
				const e = err as { code?: string; status?: number };
				if (e.code === "YAML_EXT_COLLISION") throw err;
				return null;
			}
		},

		async upsertEntry(entry: ContentEntry) {
			assertSafeEntryId(entry.id);

			const schema = schemas[entry.collection] ?? passthrough;
			const parsed = schema.safeParse(entry.data);
			if (!parsed.success) {
				throw Object.assign(new Error("Validation failed"), {
					status: 400,
					issues: parsed.error.issues,
				});
			}

			const absolutePath = await resolvePath(entry.collection, entry.id, true);
			assertAllowed(absolutePath);
			await assertNoYamlExtCollision(exists, absolutePath);

			// Persist Zod **input** (spec §5.2) so transforms like Astro
			// `reference()` do not rewrite string ids into lookup objects on disk.
			const next: ContentEntry = {
				id: entry.id,
				collection: entry.collection,
				data: entry.data,
			};

			// nodeFsWriter mkdir's parents; memoryWriter is path-key only.
			await writer.writeText(absolutePath, serializeEntryFile(next.data));

			if (!useDiscovery) {
				let list = catalog[entry.collection];
				if (!list) {
					list = [];
					catalog[entry.collection] = list;
				}
				const idx = list.findIndex((e) => e.id === entry.id);
				if (idx >= 0) list[idx] = next;
				else list.push(next);
			}

			return next;
		},

		async deleteEntry(collection: string, id: string) {
			const absolutePath = await resolvePath(collection, id, false);
			assertAllowed(absolutePath);
			await assertNoYamlExtCollision(exists, absolutePath);
			await writer.remove(absolutePath);
			if (!useDiscovery) {
				catalog[collection] = (catalog[collection] ?? []).filter(
					(e) => e.id !== id,
				);
			}
		},
	};
}
