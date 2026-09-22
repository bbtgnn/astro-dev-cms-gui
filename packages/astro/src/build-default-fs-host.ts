/**
 * Pure package-default CmsHost assembly (ADR-0016 / 0019 / 0020).
 *
 * Owns IR compile → write bases → allowPaths → authoritative validator →
 * collection descriptors → createCmsHost. Callers inject Writer + fileExists;
 * no Vite virtuals, no node:fs.
 */

import path from "node:path";
import {
	type CmsHost,
	type CollectionDescriptor,
	type Writer,
	createCmsHost,
	scanEntryIds,
} from "@cms/core";
import {
	compileSemanticIr,
	createAuthoritativeValidator,
	type SemanticConfigInput,
} from "@cms/core/semantic";
import { writeBaseFromGlob } from "./write-base-from-glob";

export type BuildDefaultFsHostOptions = {
	collections: SemanticConfigInput["collections"];
	contentRoot: string;
	writer: Writer;
	/** True when `absPath` exists and is a regular file. */
	fileExists: (absPath: string) => boolean;
};

function isSafeEntryRelativePath(imagePath: string): string | null {
	const rel = imagePath.replace(/^\.\//, "").replace(/\\/g, "/");
	if (!rel || rel.startsWith("/") || rel.split("/").includes("..")) {
		return null;
	}
	return rel;
}

export function buildDefaultFsHost(
	options: BuildDefaultFsHostOptions,
): CmsHost {
	const { collections: tree, contentRoot, writer, fileExists } = options;
	const ir = compileSemanticIr({ collections: tree });

	const bases = new Map<string, string>();
	for (const [name, collection] of Object.entries(ir.collections)) {
		bases.set(name, writeBaseFromGlob(collection.loader.base, name));
	}

	const allowPaths = [...new Set(bases.values())];

	const validator = createAuthoritativeValidator(ir, {
		entryExists: async (collection, id) => {
			const base = bases.get(collection);
			if (!base) return false;
			const ids = await scanEntryIds(writer, path.join(contentRoot, base));
			return ids.includes(id);
		},
		isAcceptedImageAsset: (imagePath) => {
			const rel = isSafeEntryRelativePath(imagePath);
			if (!rel) return false;
			for (const base of allowPaths) {
				const abs = path.join(contentRoot, base, rel);
				try {
					if (fileExists(abs)) return true;
				} catch {
					// continue
				}
			}
			return false;
		},
	});

	const collections: CollectionDescriptor[] = [...bases.entries()].map(
		([name, base]) => {
			const schema = validator.schemas[name];
			if (!schema) {
				throw new Error(
					`Authoritative validator missing schema for collection "${name}"`,
				);
			}
			return {
				name,
				base,
				schema,
				config: { base, extension: "json" },
			};
		},
	);

	return createCmsHost({
		root: contentRoot,
		allowPaths,
		writer,
		collections,
		schemas: { ...validator.schemas },
	});
}
