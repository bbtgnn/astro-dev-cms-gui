/**
 * P2 — discover editable collections from a live `content.config` `collections` export.
 * Loader glob `base` is not exposed by Astro; attach a hint via `withLoaderPathHint`
 * and/or set `config({ base })` on the root schema.
 */
import path from "node:path";
import { type CollectionConfig, readFieldMeta } from "@cms/fields";
import { z } from "zod";
import { idFromRelPath } from "./path-resolve";
import type { Writer } from "./types";

/** Attached onto Astro loaders so discovery can read glob base without private APIs. */
export const CMS_LOADER_HINT = "cms" as const;

export type LoaderPathHint = {
	/** Path relative to write-mode `root` (e.g. `posts`). */
	base: string;
	pattern?: string | string[];
};

export type DiscoveredCollection = {
	name: string;
	label?: string;
	schema: z.ZodType;
	config?: CollectionConfig;
	/** Entry directory relative to write-mode `root`. */
	base: string;
	loaderHint?: string;
	hidden?: boolean;
};

type SchemaContextStub = {
	image: () => z.ZodType;
};

type LooseLoader = {
	name?: string;
	schema?: unknown;
	createSchema?: (context: SchemaContextStub) => unknown;
	[CMS_LOADER_HINT]?: LoaderPathHint;
	cms?: LoaderPathHint;
};

type LooseCollection = {
	type?: string;
	loader?: LooseLoader | (() => unknown);
	schema?: unknown;
};

function normalizeFs(p: string): string {
	return path.resolve(p).replace(/\\/g, "/");
}

/** Tag an Astro (or other) loader with path metadata for discovery. */
export function withLoaderPathHint<T extends object>(
	loader: T,
	hint: LoaderPathHint,
): T & { cms: LoaderPathHint } {
	return Object.assign(loader, { cms: hint });
}

function readLoaderHint(
	loader: LooseLoader | undefined,
): LoaderPathHint | undefined {
	if (!loader || typeof loader !== "object") return undefined;
	return loader[CMS_LOADER_HINT] ?? loader.cms;
}

const imageStub = () => z.string();

/** Resolve collection schema the same way Astro prefers: collection → loader. */
export function resolveCollectionSchema(
	collection: LooseCollection,
): z.ZodType | undefined {
	const context: SchemaContextStub = { image: imageStub };

	const candidates: unknown[] = [];
	if (collection.schema !== undefined) candidates.push(collection.schema);

	const loader =
		typeof collection.loader === "object" ? collection.loader : undefined;
	if (loader?.schema !== undefined) candidates.push(loader.schema);
	if (typeof loader?.createSchema === "function") {
		candidates.push(loader.createSchema(context));
	}

	for (const candidate of candidates) {
		if (typeof candidate === "function") {
			const resolved = (candidate as (ctx: SchemaContextStub) => unknown)(
				context,
			);
			if (resolved && typeof resolved === "object" && "_zod" in resolved) {
				return resolved as z.ZodType;
			}
		} else if (
			candidate &&
			typeof candidate === "object" &&
			"_zod" in candidate
		) {
			return candidate as z.ZodType;
		}
	}
	return undefined;
}

function resolveBase(
	name: string,
	config: CollectionConfig | undefined,
	hint: LoaderPathHint | undefined,
): string | undefined {
	const raw = config?.base ?? hint?.base;
	if (!raw) return undefined;
	const normalized = raw.replace(/\\/g, "/").replace(/\/+$/, "");
	if (!normalized || normalized === ".") return undefined;
	// Collection name as last-resort when hint says so
	if (normalized === name) return name;
	return normalized;
}

export type DiscoverCollectionsOptions = {
	/** Skip collections with `config.hidden` / unresolved schema or base (default true). */
	onlyEditable?: boolean;
};

/**
 * Walk `export const collections` from a Vite-imported `content.config.*`.
 * Skips live collections and entries without a resolvable Zod schema + base.
 */
export function discoverCollections(
	collections: Record<string, unknown>,
	_options: DiscoverCollectionsOptions = {},
): DiscoveredCollection[] {
	const onlyEditable = _options.onlyEditable ?? true;
	const out: DiscoveredCollection[] = [];

	for (const [name, value] of Object.entries(collections)) {
		if (!value || typeof value !== "object") continue;
		const def = value as LooseCollection;

		if (def.type === "live") continue;

		const schema = resolveCollectionSchema(def);
		if (!schema) {
			if (!onlyEditable) continue;
			continue;
		}

		const meta = readFieldMeta(schema);
		const config = meta?.config;
		const loader = typeof def.loader === "object" ? def.loader : undefined;
		const hint = readLoaderHint(loader);
		const base = resolveBase(name, config, hint);

		if (!base) {
			if (!onlyEditable) continue;
			continue;
		}

		const hidden = Boolean(config?.hidden);
		if (onlyEditable && hidden) continue;

		out.push({
			name,
			label: config?.label,
			schema,
			config,
			base,
			loaderHint: loader?.name ?? hint?.pattern?.toString(),
			hidden,
		});
	}

	return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * FS-scan YAML entry ids under `baseDir` (`id` = relpath without extension).
 * Prefers listing via `writer.list` (works for memory + node writers).
 */
export async function scanYamlEntryIds(
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
			await walk(path.join(normalized, name), rel);
		}
	}

	await walk(root, "");
	return [...ids].sort();
}
