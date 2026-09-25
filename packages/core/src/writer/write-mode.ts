/**
 * createWriteMode with allowlisted paths.
 * Collection descriptors + FS scan (or optional entryIndex).
 * Guarded write-back: opaque revisions + async Zod input validation (ADR-0010, 0014).
 */
import * as pathe from "pathe";
import { z } from "zod";
import { opaqueRevision } from "../protocol/revision";
import type { CollectionDescriptor } from "./collection-descriptors";
import { scanEntryIds } from "./collection-descriptors";
import { parseEntryFile, serializeEntryFile } from "./entry-file";
import { normalizeFs } from "./path-normalize";
import {
	applyPathTemplate,
	assertSafeEntryId,
	DEFAULT_ENTRY_EXTENSION,
	resolveEntryPath,
	writerExists,
} from "./path-resolve";
import type {
	ContentEntry,
	CreateWriteModeOptions,
	ReadAssetResult,
	UpsertEntryInput,
	WriteImageAssetsInput,
	WriteMode,
	WrittenImageAssets,
} from "./types";

function joinRoot(root: string, rel: string): string {
	return normalizeFs(pathe.join(root, rel));
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

function revisionConflict(message = "Conflict"): never {
	throw Object.assign(new Error(message), {
		status: 409,
		code: "REVISION_CONFLICT",
	});
}

async function entryFromRaw(
	id: string,
	collection: string,
	raw: string,
): Promise<ContentEntry> {
	const data = parseEntryFile(raw);
	return { id, collection, data, revision: await opaqueRevision(raw) };
}

const passthrough = z.record(z.string(), z.unknown());

export function createWriteMode(options: CreateWriteModeOptions): WriteMode {
	const {
		root,
		allowPaths,
		writer,
		collections = [],
		entryIndex = {},
		schemas: schemaOverrides = {},
	} = options;

	const byName = new Map<string, CollectionDescriptor>(
		collections.map((c) => [c.name, c]),
	);
	const schemas: Record<string, z.ZodType> = { ...schemaOverrides };
	for (const c of collections) {
		if (!schemas[c.name]) schemas[c.name] = c.schema;
	}

	const exists = writerExists((p) => writer.readText(p));

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
		const discovered = byName.get(collection);
		if (discovered) {
			assertSafeEntryId(id);
			const baseRel = discovered.config?.base ?? discovered.base;
			const baseAbs = joinRoot(root, baseRel);
			const preferred = discovered.config?.extension ?? DEFAULT_ENTRY_EXTENSION;

			if (discovered.config?.pathTemplate) {
				const rel = applyPathTemplate(discovered.config.pathTemplate, {
					base: baseRel,
					id,
					ext: preferred,
				});
				return joinRoot(root, rel);
			}

			const resolved = await resolveEntryPath(exists, baseAbs, id, {
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
			return collections
				.filter((c) => !c.hidden && !c.config?.hidden)
				.map((c) => ({
					name: c.name,
					label: c.label ?? c.config?.label,
					loaderHint: c.loaderHint,
				}));
		},

		async listEntries(collection: string) {
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
			const ids = await scanEntryIds(writer, baseAbs);
			return ids.map((id) => ({ id }));
		},

		async getEntry(collection: string, id: string) {
			if (!byName.has(collection)) return null;

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
				const raw = await writer.readText(absolutePath);
				return await entryFromRaw(id, collection, raw);
			} catch {
				return null;
			}
		},

		async upsertEntry(input: UpsertEntryInput) {
			assertSafeEntryId(input.id);

			const schema = schemas[input.collection] ?? passthrough;
			// Authoritative async Zod path (ADR-0010). Acceptance uses input shape;
			// never persist transformed Astro/Zod output.
			const parsed = await schema.safeParseAsync(input.data);
			if (!parsed.success) {
				throw Object.assign(new Error("Validation failed"), {
					status: 400,
					code: "VALIDATION_FAILED",
					issues: parsed.error.issues,
				});
			}

			const absolutePath = await resolvePath(input.collection, input.id, true);
			assertAllowed(absolutePath);

			let currentRaw: string | null = null;
			try {
				currentRaw = await writer.readText(absolutePath);
			} catch {
				currentRaw = null;
			}

			if (input.expectedRevision === null) {
				if (currentRaw !== null) {
					revisionConflict("Entry already exists");
				}
			} else if (currentRaw === null) {
				throw Object.assign(new Error("Not found"), {
					status: 404,
					code: "NOT_FOUND",
				});
			} else {
				const current = await opaqueRevision(currentRaw);
				if (current !== input.expectedRevision) {
					revisionConflict();
				}
			}

			// Persist Zod **input** (ADR-0010) so transforms like Astro
			// `reference()` do not rewrite string ids into lookup objects on disk.
			const serialized = serializeEntryFile(input.data);
			const next: ContentEntry = {
				id: input.id,
				collection: input.collection,
				data: input.data,
				revision: await opaqueRevision(serialized),
			};

			// nodeFsWriter replaces atomically (temp + rename); memoryWriter is path-key.
			await writer.writeText(absolutePath, serialized);

			return next;
		},

		async deleteEntry(collection: string, id: string) {
			const absolutePath = await resolvePath(collection, id, false);
			assertAllowed(absolutePath);
			await writer.remove(absolutePath);
		},

		async writeImageAssets(
			input: WriteImageAssetsInput,
		): Promise<WrittenImageAssets> {
			assertSafeEntryId(input.id);
			const folderName = sanitizeAssetFolderName(input.name ?? "cover");
			const fileName = sanitizeAssetFileName(input.filename);
			const entryPath = await resolvePath(input.collection, input.id, true);
			assertAllowed(entryPath);

			const discovered = byName.get(input.collection);
			const baseRel =
				discovered?.config?.base ?? discovered?.base ?? input.collection;
			const folderRel = pathe.join(baseRel, input.id, folderName);
			const folderAbs = joinRoot(root, folderRel);
			assertAllowed(folderAbs);

			let existing: string[] = [];
			try {
				existing = await writer.list(folderAbs);
			} catch {
				existing = [];
			}
			for (const name of existing) {
				const abs = normalizeFs(pathe.join(folderAbs, name));
				if (!abs.startsWith(`${folderAbs}/`)) continue;
				assertAllowed(abs);
				await writer.remove(abs);
			}

			const fileAbs = normalizeFs(pathe.join(folderAbs, fileName));
			if (!fileAbs.startsWith(`${folderAbs}/`)) {
				throw Object.assign(new Error(`Unsafe asset path: ${fileName}`), {
					status: 400,
					code: "UNSAFE_ASSET",
				});
			}
			assertAllowed(fileAbs);
			await writer.writeBytes(fileAbs, input.bytes);

			const entryDir = pathe.dirname(entryPath);
			const relForEntry = pathe.relative(entryDir, fileAbs).replace(/\\/g, "/");
			const entryRelativePath = relForEntry.startsWith(".")
				? relForEntry
				: `./${relForEntry}`;

			return {
				path: entryRelativePath,
				files: [pathe.relative(root, fileAbs).replace(/\\/g, "/")],
			};
		},

		async readAsset(relFromRoot: string): Promise<ReadAssetResult> {
			const cleaned = relFromRoot.replace(/^\/+/, "").replace(/\\/g, "/");
			if (
				!cleaned ||
				cleaned.includes("..") ||
				pathe.isAbsolute(cleaned) ||
				cleaned.startsWith("/")
			) {
				throw Object.assign(new Error(`Unsafe asset path: ${relFromRoot}`), {
					status: 400,
					code: "UNSAFE_ASSET",
				});
			}
			const absolutePath = joinRoot(root, cleaned);
			assertAllowed(absolutePath);
			const bytes = await writer.readBytes(absolutePath);
			return { bytes, contentType: contentTypeFor(cleaned) };
		},
	};
}

function sanitizeAssetFolderName(name: string): string {
	if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
		throw Object.assign(new Error(`Unsafe folder name: ${name}`), {
			status: 400,
			code: "UNSAFE_ASSET",
		});
	}
	return name;
}

function sanitizeAssetFileName(name: string): string {
	const base = pathe.basename(name.replace(/\\/g, "/"));
	const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
	if (
		!cleaned ||
		cleaned === "." ||
		cleaned === ".." ||
		cleaned.startsWith(".")
	) {
		throw Object.assign(new Error(`Unsafe asset name: ${name}`), {
			status: 400,
			code: "UNSAFE_ASSET",
		});
	}
	return cleaned;
}

function contentTypeFor(rel: string): string {
	const lower = rel.toLowerCase();
	if (lower.endsWith(".webp")) return "image/webp";
	if (lower.endsWith(".png")) return "image/png";
	if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
	if (lower.endsWith(".gif")) return "image/gif";
	return "application/octet-stream";
}
