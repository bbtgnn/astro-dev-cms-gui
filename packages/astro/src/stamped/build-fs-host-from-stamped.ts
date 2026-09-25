/**
 * Build CmsHost from stamped content.config collections (schema-first path).
 *
 * Location comes from {@link LOADER_STAMP} on `glob` loaders (ADR-0007 write bases).
 * Authoritative validate uses persisted **Input** Zod (paths / ids for image/ref —
 * ADR-0010), not Astro-transformed Output. Form projection uses the returned
 * stamped schemas via ticket 03 (`projectSchemaFormModels` → authoringProps*).
 *
 * Escape (documented choice): **fail closed** when a loader has no stamp, unless
 * `locations[name]` supplies an explicit write base. `file()` loaders are
 * unsupported with a clear error (use `glob` or explicit location later).
 *
 * Loading: prefer Vite SSR of `src/content.config.*` with
 * {@link viteAliasesForBoot} + {@link vitePluginsForBoot} active, then pass
 * `collections` through {@link collectionsFromContentConfigExport}. Tests may
 * import fixtures that already use the loaders shim.
 */

import path from "node:path";
import {
	type CmsHost,
	type CollectionDescriptor,
	createCmsHost,
	scanEntryIds,
	type Writer,
} from "@cms/core";
import {
	type InputValidatorDeps,
	toPersistedInputSchema,
} from "@cms/core/semantic";
import { z } from "zod";
import { stampImageSchema } from "../content-proxy/stamp-helpers";
import { getLoaderStamp } from "../content-proxy/stamps";

export type CollectionLocationOverride = {
	/** Write folder relative to `contentRoot` (ADR-0007). */
	base: string;
	extension?: "json";
};

export type StampedCollectionConfig = {
	loader?: unknown;
	/**
	 * Zod schema or Astro function schema. Typed loosely so Astro
	 * `SchemaContext` (rich `image()`) assigns into stamped content.config.
	 */
	schema?:
		| z.ZodType
		| ((ctx: { image: () => z.ZodType }) => z.ZodType)
		// Astro CollectionConfig.schema (SchemaContext) — accept without fighting image() Output.
		| ((ctx: never) => z.ZodType)
		| unknown;
};

export type MaterializedStampedCollection = {
	loader?: unknown;
	schema: z.ZodType;
};

export type BuildFsHostFromStampedOptions = {
	collections: Readonly<
		Record<string, StampedCollectionConfig | MaterializedStampedCollection>
	>;
	contentRoot: string;
	writer: Writer;
	/** True when `absPath` exists and is a regular file. */
	fileExists: (absPath: string) => boolean;
	/**
	 * Explicit location escape for unstamped / custom loaders.
	 * Missing stamp + missing override → fail closed.
	 */
	locations?: Readonly<Record<string, CollectionLocationOverride>>;
};

export type BuildFsHostFromStampedResult = {
	host: CmsHost;
	/**
	 * Materialized stamped collection schemas for form projection
	 * (`projectSchemaFormModels` → `authoringPropsFromFormModels`).
	 */
	stampedSchemas: Readonly<Record<string, z.ZodType>>;
};

/** Map IR/Astro glob `base` onto write-mode folder relative to `contentRoot`. */
function writeBaseFromGlob(
	loaderBase: string | undefined,
	collectionId: string,
): string {
	if (!loaderBase) return collectionId;
	const normalized = loaderBase.replace(/\\/g, "/").replace(/\/+$/, "");
	const last = normalized.split("/").filter(Boolean).pop();
	if (last && last !== "." && last !== "..") return last;
	return collectionId;
}

function isSafeEntryRelativePath(imagePath: string): string | null {
	const rel = imagePath.replace(/^\.\//, "").replace(/\\/g, "/");
	if (!rel || rel.startsWith("/") || rel.split("/").includes("..")) {
		return null;
	}
	return rel;
}

function materializeSchema(
	schema: StampedCollectionConfig["schema"],
	name: string,
): z.ZodType {
	if (!schema) {
		throw new Error(`Collection "${name}" has no schema`);
	}
	if (typeof schema === "function") {
		const fn = schema as (ctx: { image: () => z.ZodType }) => z.ZodType;
		return fn({
			image: () => stampImageSchema(z.string()),
		});
	}
	return schema as z.ZodType;
}

/** Materialize Astro function schemas with stamped Input `image()` (CMS path/id). */
export { materializeSchema };

function resolveCollectionLocation(
	name: string,
	loader: unknown,
	override: CollectionLocationOverride | undefined,
): { base: string; extension: "json" } {
	if (override) {
		return {
			base: override.base,
			extension: override.extension ?? "json",
		};
	}

	const stamp = getLoaderStamp(loader);
	if (!stamp) {
		throw new Error(
			`Collection "${name}": loader has no LOADER_STAMP (fail closed). ` +
				`Import glob/file from astro/loaders with content-proxy boot, ` +
				`or pass locations["${name}"] = { base }.`,
		);
	}
	if (stamp.kind === "file") {
		throw new Error(
			`Collection "${name}": file() loaders are unsupported by the FS host ` +
				`(v1 expects glob + JSON entries under a write base).`,
		);
	}
	return {
		base: writeBaseFromGlob(stamp.base, name),
		extension: "json",
	};
}

/**
 * Normalize a content.config `collections` export (already loaded with shims /
 * Vite boot) into materialized `{ loader, schema }` entries.
 */
export function collectionsFromContentConfigExport(mod: {
	collections?: Readonly<Record<string, StampedCollectionConfig>>;
}): Record<string, MaterializedStampedCollection> {
	const collections = mod.collections;
	if (!collections || typeof collections !== "object") {
		throw new Error("content.config must export a `collections` object");
	}
	const out: Record<string, MaterializedStampedCollection> = {};
	for (const [name, config] of Object.entries(collections)) {
		out[name] = {
			loader: config.loader,
			schema: materializeSchema(config.schema, name),
		};
	}
	return out;
}

/**
 * Assemble package-default CmsHost from stamped collections (no Vite, no node:fs).
 * Exported from `@cms/astro/testing` for demos and ticket 05 wiring.
 */
export function buildFsHostFromStampedCollections(
	options: BuildFsHostFromStampedOptions,
): BuildFsHostFromStampedResult {
	const {
		collections: input,
		contentRoot,
		writer,
		fileExists,
		locations = {},
	} = options;

	const stampedSchemas: Record<string, z.ZodType> = {};
	const bases = new Map<string, string>();
	const extensions = new Map<string, "json">();

	for (const [name, config] of Object.entries(input)) {
		const schema = materializeSchema(config.schema, name);
		stampedSchemas[name] = schema;
		const loc = resolveCollectionLocation(name, config.loader, locations[name]);
		bases.set(name, loc.base);
		extensions.set(name, loc.extension);
	}

	const allowPaths = [...new Set(bases.values())];

	const deps: InputValidatorDeps = {
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
	};

	const inputSchemas: Record<string, z.ZodType> = {};
	for (const [name, schema] of Object.entries(stampedSchemas)) {
		inputSchemas[name] = toPersistedInputSchema(schema, deps, "");
	}

	const collections: CollectionDescriptor[] = [...bases.entries()].map(
		([name, base]) => {
			const schema = inputSchemas[name];
			if (!schema) {
				throw new Error(
					`Authoritative Input schema missing for collection "${name}"`,
				);
			}
			return {
				name,
				base,
				schema,
				config: {
					base,
					extension: extensions.get(name) ?? "json",
				},
			};
		},
	);

	const host = createCmsHost({
		root: contentRoot,
		allowPaths,
		writer,
		collections,
		schemas: { ...inputSchemas },
	});

	return { host, stampedSchemas };
}
