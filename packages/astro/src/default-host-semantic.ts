/**
 * Package default CmsHost for CMS-first hosts (ADR-0019).
 *
 * Loads the Svelte-free schema partition, builds the authoritative
 * persisted-input validator (image allowlist + reference existence), and
 * derives collection bases from IR glob loaders — not from Astro `image()` /
 * FieldUi `.meta()` on generated `content.config`.
 */

import fs from "node:fs";
import path from "node:path";
import {
	type CmsHost,
	createCmsHost,
	type DiscoveredCollection,
	nodeFsWriter,
	scanEntryIds,
} from "@cms/core";
import {
	type CompiledSemanticIr,
	compileSemanticIr,
	createAuthoritativeValidator,
	type SemanticConfigInput,
} from "@cms/core/semantic";
import { contentRoot } from "virtual:@cms/integration-options";
import { collections as partitionCollections } from "virtual:@cms/schema-partition";
import { writeBaseFromGlob } from "./write-base-from-glob";

export { writeBaseFromGlob } from "./write-base-from-glob";

function isSafeEntryRelativePath(imagePath: string): string | null {
	const rel = imagePath.replace(/^\.\//, "").replace(/\\/g, "/");
	if (!rel || rel.startsWith("/") || rel.split("/").includes("..")) {
		return null;
	}
	return rel;
}

function compilePartition(
	collections: SemanticConfigInput["collections"],
): CompiledSemanticIr {
	return compileSemanticIr({ collections });
}

export function createHost(): CmsHost {
	const ir = compilePartition(partitionCollections);
	const writer = nodeFsWriter();

	const bases = new Map<string, string>();
	for (const [name, collection] of Object.entries(ir.collections)) {
		bases.set(name, writeBaseFromGlob(collection.loader.base, name));
	}

	const allowPaths = [...new Set(bases.values())];

	const validator = createAuthoritativeValidator(ir, {
		entryExists: async (collection, id) => {
			const base = bases.get(collection);
			if (!base) return false;
			const ids = await scanEntryIds(
				writer,
				path.join(contentRoot, base),
			);
			return ids.includes(id);
		},
		isAcceptedImageAsset: (imagePath) => {
			const rel = isSafeEntryRelativePath(imagePath);
			if (!rel) return false;
			for (const base of allowPaths) {
				const abs = path.join(contentRoot, base, rel);
				try {
					if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
						return true;
					}
				} catch {
					// continue
				}
			}
			return false;
		},
	});

	const collections: DiscoveredCollection[] = [...bases.entries()].map(
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
