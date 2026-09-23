/**
 * Vite plugin: emit CMS Input collection types when content.config is present.
 * Uses the host Vite server (content-proxy already installed) — no nested createServer.
 */
import fs from "node:fs";
import path from "node:path";
import { collectionsFromContentConfigExport } from "../build-fs-host-from-stamped";
import type { CmsVitePlugin } from "../vite-config-plugin";
import {
	CMS_COLLECTION_TYPES_FILENAME,
	printCollectionTypesFile,
} from "./emit-collection-types";

export type CmsCollectionTypesVitePluginOptions = {
	projectRoot: string;
	/** Absolute path to content.config. */
	contentConfigEntry: string;
};

type ViteDevServer = {
	ssrLoadModule: (id: string) => Promise<unknown>;
	watcher: { on: (event: string, cb: (file: string) => void) => void };
};

/**
 * Emits `src/cms.types.d.ts` after server listen / content.config change.
 * Types-only — does not affect runtime host.
 */
export function cmsCollectionTypesVitePlugin(
	options: CmsCollectionTypesVitePluginOptions,
): CmsVitePlugin & {
	configureServer?: (server: ViteDevServer) => void;
} {
	const root = path.resolve(options.projectRoot);
	const entry = path.normalize(options.contentConfigEntry);
	const outFile = path.join(root, "src", CMS_COLLECTION_TYPES_FILENAME);
	let running: Promise<void> | null = null;

	const emitFromMod = async (mod: unknown) => {
		const materialized = collectionsFromContentConfigExport(
			mod as { collections?: Record<string, never> },
		);
		const schemas: Record<string, (typeof materialized)[string]["schema"]> =
			{};
		for (const [name, col] of Object.entries(materialized)) {
			schemas[name] = col.schema;
		}
		const source = printCollectionTypesFile(schemas);
		fs.mkdirSync(path.dirname(outFile), { recursive: true });
		fs.writeFileSync(outFile, source, "utf8");
	};

	const run = (server: ViteDevServer) => {
		if (running) return running;
		running = server
			.ssrLoadModule(entry)
			.then((mod) => emitFromMod(mod))
			.catch((err: unknown) => {
				const message = err instanceof Error ? err.message : String(err);
				console.warn(`[cms] collection types emit failed: ${message}`);
			})
			.finally(() => {
				running = null;
			});
		return running;
	};

	return {
		name: "@cms/astro:collection-types",
		enforce: "pre",
		resolveId() {
			return null;
		},
		load() {
			return null;
		},
		configureServer(server) {
			void run(server);
			server.watcher.on("change", (file) => {
				if (path.normalize(file) === entry) {
					void run(server);
				}
			});
		},
	};
}
