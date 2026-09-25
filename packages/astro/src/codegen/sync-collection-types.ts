/**
 * Load content.config under content-proxy and emit CMS Input collection types.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import { proxyAssets } from "../content-proxy/assets";
import {
	CONTENT_CONFIG_CONVENTION,
	resolveConventionEntry,
} from "../host/vite-config-plugin";
import {
	collectionsFromContentConfigExport,
	materializeSchema,
	type StampedCollectionConfig,
} from "../stamped/build-fs-host-from-stamped";
import {
	CMS_COLLECTION_TYPES_FILENAME,
	printCollectionTypesFile,
} from "./emit-collection-types";

export type SyncCollectionTypesOptions = {
	projectRoot: string;
	/** Absolute path to content.config; default convention resolve. */
	contentConfigEntry?: string;
	/** Absolute output path; default `<projectRoot>/src/cms.types.d.ts`. */
	outFile?: string;
};

export type SyncCollectionTypesResult = {
	outFile: string;
	collectionNames: string[];
};

const syncContentShim = fileURLToPath(
	new URL("../content-proxy/shims/astro-content-sync.ts", import.meta.url),
);

/**
 * Vite SSR-load content.config with sync shims (no Astro virtual `astro:content`).
 */
export async function syncCmsCollectionTypes(
	options: SyncCollectionTypesOptions,
): Promise<SyncCollectionTypesResult> {
	const root = path.resolve(options.projectRoot);
	const entry =
		options.contentConfigEntry ??
		resolveConventionEntry(root, CONTENT_CONFIG_CONVENTION);
	if (entry == null) {
		throw new Error(
			`No content.config found under ${root} (looked for ${CONTENT_CONFIG_CONVENTION.join(", ")}).`,
		);
	}

	const { loaders } = proxyAssets();
	const { createServer } = await import("vite");
	const server = await createServer({
		configFile: false,
		root,
		server: { middlewareMode: true },
		appType: "custom",
		resolve: {
			alias: [
				{ find: /^astro\/loaders$/, replacement: loaders },
				{ find: "astro:content", replacement: syncContentShim },
			],
		},
		optimizeDeps: { noDiscovery: true, include: [] },
	});

	let mod: { collections?: Record<string, StampedCollectionConfig> };
	try {
		mod = (await server.ssrLoadModule(entry)) as typeof mod;
	} finally {
		await server.close();
	}

	const materialized = collectionsFromContentConfigExport(mod);
	const schemas: Record<string, z.ZodType> = {};
	for (const [name, col] of Object.entries(materialized)) {
		schemas[name] = col.schema;
	}

	const outFile =
		options.outFile ?? path.join(root, "src", CMS_COLLECTION_TYPES_FILENAME);
	const source = printCollectionTypesFile(schemas);
	fs.mkdirSync(path.dirname(outFile), { recursive: true });
	fs.writeFileSync(outFile, source, "utf8");

	return {
		outFile,
		collectionNames: Object.keys(schemas).sort(),
	};
}

/** Materialize a single Astro collection config schema (for defineAstroCms). */
export function materializeCollectionSchemas(
	collections: Readonly<Record<string, StampedCollectionConfig>>,
): Record<string, z.ZodType> {
	const out: Record<string, z.ZodType> = {};
	for (const [name, config] of Object.entries(collections)) {
		out[name] = materializeSchema(config.schema, name);
	}
	return out;
}
