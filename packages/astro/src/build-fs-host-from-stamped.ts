/**
 * Build CmsHost from stamped content.config collections (schema-first path).
 *
 * Location comes from {@link LOADER_STAMP} on `glob` loaders (ADR-0007 write bases).
 * Authoritative validate uses persisted **Input** Zod (paths / ids for image/ref —
 * ADR-0010), not Astro-transformed Output. Form projection uses the returned
 * stamped schemas via ticket 03 (`editorCollectionsFromSchemas`).
 *
 * Escape (documented choice): **fail closed** when a loader has no stamp, unless
 * `locations[name]` supplies an explicit write base. `file()` loaders are
 * unsupported with a clear error (use `glob` or explicit location later).
 *
 * Loading: prefer Vite SSR of `src/content.config.*` with
 * {@link viteAliasesForBoot} + {@link vitePluginsForBoot} active, then pass
 * `collections` through {@link collectionsFromContentConfigExport}. Tests may
 * import fixtures that already use the loaders shim.
 *
 * Keeps {@link buildDefaultFsHost} (IR path) available until ticket 05 flips `cms()`.
 */

import path from "node:path";
import {
	type CmsHost,
	type CollectionDescriptor,
	createCmsHost,
	scanEntryIds,
	type Writer,
} from "@cms/core";
import { z } from "zod";
import {
	CONTENT_FIELD_STAMP,
	type ContentFieldStamp,
	getContentFieldStamp,
	stampImageSchema,
} from "./content-proxy/stamp-helpers";
import { getLoaderStamp } from "./content-proxy/stamps";

export type CollectionLocationOverride = {
	/** Write folder relative to `contentRoot` (ADR-0007). */
	base: string;
	extension?: "json";
};

export type StampedCollectionConfig = {
	loader?: unknown;
	schema?:
		| z.ZodType
		| ((ctx: { image: () => z.ZodType }) => z.ZodType);
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
	 * (`editorCollectionsFromSchemas` / `projectSchemaFormModels`).
	 */
	stampedSchemas: Readonly<Record<string, z.ZodType>>;
};

type CmsMeta = { cms?: { kind?: string; collection?: string } };

type ZodWalkNode = {
	readonly [CONTENT_FIELD_STAMP]?: ContentFieldStamp;
	readonly meta?: (() => unknown) | unknown;
	readonly type?: string;
	readonly unwrap?: () => unknown;
	readonly shape?: Record<string, unknown>;
	readonly element?: unknown;
	readonly def?: {
		readonly type?: string;
		readonly innerType?: unknown;
		readonly defaultValue?: unknown;
		readonly element?: unknown;
	};
};

function readStamp(schema: unknown): ContentFieldStamp | undefined {
	const fromSymbol = getContentFieldStamp(schema);
	if (fromSymbol) return fromSymbol;
	if (!schema || typeof schema !== "object") return undefined;
	const node = schema as ZodWalkNode;
	let meta: unknown = node.meta;
	if (typeof meta === "function") {
		try {
			meta = meta.call(schema);
		} catch {
			meta = undefined;
		}
	}
	const cms = (meta as CmsMeta | undefined)?.cms;
	if (cms?.kind === "image") return { kind: "image" };
	if (cms?.kind === "reference" && typeof cms.collection === "string") {
		return { kind: "reference", collection: cms.collection };
	}
	return undefined;
}

function unwrapZod(schema: unknown): {
	inner: unknown;
	optional: boolean;
	nullable: boolean;
	defaultValue?: unknown;
	stamp: ContentFieldStamp | undefined;
} {
	let optional = false;
	let nullable = false;
	let defaultValue: unknown;
	let stamp = readStamp(schema);
	let current: unknown = schema;

	for (let i = 0; i < 8; i++) {
		if (!current || typeof current !== "object") break;
		const node = current as ZodWalkNode;
		stamp = stamp ?? readStamp(current);
		const t = node.type ?? node.def?.type;
		if (t === "optional" && typeof node.unwrap === "function") {
			optional = true;
			current = node.unwrap();
			continue;
		}
		if (t === "nullable" && typeof node.unwrap === "function") {
			nullable = true;
			current = node.unwrap();
			continue;
		}
		if (t === "default" && typeof node.unwrap === "function") {
			if (node.def?.defaultValue !== undefined) {
				defaultValue = node.def.defaultValue;
			}
			current = node.unwrap();
			continue;
		}
		break;
	}

	stamp = stamp ?? readStamp(current);
	return {
		inner: current,
		optional,
		nullable,
		...(defaultValue !== undefined ? { defaultValue } : {}),
		stamp,
	};
}

function zodObjectShape(
	schema: unknown,
): Record<string, unknown> | undefined {
	if (!schema || typeof schema !== "object") return undefined;
	const shape = (schema as ZodWalkNode).shape;
	if (shape && typeof shape === "object") {
		return shape;
	}
	return undefined;
}

function zodArrayElement(schema: unknown): unknown {
	if (!schema || typeof schema !== "object") return undefined;
	const node = schema as ZodWalkNode;
	if (node.element !== undefined) return node.element;
	return node.def?.element;
}

type InputValidatorDeps = {
	isAcceptedImageAsset?: (path: string) => boolean | Promise<boolean>;
	entryExists?: (
		collection: string,
		id: string,
	) => boolean | Promise<boolean>;
};

/**
 * Rewrite stamped image/ref leaves to persisted Input strings (+ host checks).
 * Other structure stays on the live schema. Ensures protocol values are paths/ids
 * even when Astro’s Zod looks like metadata Output.
 */
function toPersistedInputSchema(
	schema: z.ZodType,
	deps: InputValidatorDeps | undefined,
	fieldPath: string,
): z.ZodType {
	const { inner, optional, nullable, defaultValue, stamp } = unwrapZod(schema);

	let result: z.ZodType;
	if (stamp?.kind === "image") {
		result = z.string();
		if (deps?.isAcceptedImageAsset) {
			const check = deps.isAcceptedImageAsset;
			result = z.string().refine(async (value) => check(value), {
				message: `Image path not accepted at ${fieldPath}`,
			});
		}
	} else if (stamp?.kind === "reference") {
		const target = stamp.collection;
		result = z.string();
		if (deps?.entryExists) {
			const exists = deps.entryExists;
			result = z.string().refine(async (id) => exists(target, id), {
				message: `Reference "${fieldPath}" target not found in collection "${target}"`,
			});
		}
	} else {
		const shape = zodObjectShape(inner);
		if (shape) {
			const next: Record<string, z.ZodType> = {};
			for (const [key, child] of Object.entries(shape)) {
				next[key] = toPersistedInputSchema(
					child as z.ZodType,
					deps,
					fieldPath === "" ? key : `${fieldPath}.${key}`,
				);
			}
			result = z.object(next);
		} else {
			const el = zodArrayElement(inner);
			if (el !== undefined) {
				result = z.array(
					toPersistedInputSchema(
						el as z.ZodType,
						deps,
						`${fieldPath}[]`,
					),
				);
			} else {
				result = inner as z.ZodType;
			}
		}
	}

	if (nullable) result = result.nullable();
	if (optional) result = result.optional();
	if (defaultValue !== undefined) result = result.default(defaultValue);
	return result;
}

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
		return schema({
			image: () => stampImageSchema(z.string()),
		});
	}
	return schema;
}

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
		const loc = resolveCollectionLocation(
			name,
			config.loader,
			locations[name],
		);
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
