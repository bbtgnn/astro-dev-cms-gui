/**
 * Vite virtual modules for the Astro host integration:
 * - `virtual:@cms/config` — Node-safe unified tree (`cms.config.ts`)
 * - `virtual:@cms/components` — Vite-only live Svelte catalog (`cms.components.ts`)
 * - `virtual:@cms/host` — `createHost()` factory (project or package default)
 * - `virtual:@cms/schema-partition` — same Svelte-free tree for the CMS-first host
 * - `virtual:@cms/integration-options` — mount / allowInProd / contentRoot
 *
 * Catalog values stay live module bindings in the host Vite graph —
 * they are never serialized through Astro props or the CMS protocol.
 */
import fs from "node:fs";
import path from "node:path";

export const CMS_CONFIG_VIRTUAL_ID = "virtual:@cms/config";
const CMS_CONFIG_RESOLVED_ID = `\0${CMS_CONFIG_VIRTUAL_ID}`;

export const CMS_COMPONENTS_VIRTUAL_ID = "virtual:@cms/components";
const CMS_COMPONENTS_RESOLVED_ID = `\0${CMS_COMPONENTS_VIRTUAL_ID}`;

export const CMS_HOST_VIRTUAL_ID = "virtual:@cms/host";
const CMS_HOST_RESOLVED_ID = `\0${CMS_HOST_VIRTUAL_ID}`;

export const CMS_SCHEMA_PARTITION_VIRTUAL_ID = "virtual:@cms/schema-partition";
const CMS_SCHEMA_PARTITION_RESOLVED_ID = `\0${CMS_SCHEMA_PARTITION_VIRTUAL_ID}`;

export const CMS_INTEGRATION_OPTIONS_VIRTUAL_ID =
	"virtual:@cms/integration-options";
const CMS_INTEGRATION_OPTIONS_RESOLVED_ID = `\0${CMS_INTEGRATION_OPTIONS_VIRTUAL_ID}`;

/** Convention paths for the Node-safe unified tree (ADR-0016 / 0019). */
export const CMS_CONFIG_CONVENTION = [
	"src/cms.config.ts",
	"src/cms.config.mjs",
	"src/cms.config.js",
] as const;

/**
 * Schema partition for generation + CMS-first default host.
 * Same files as {@link CMS_CONFIG_CONVENTION} (Svelte-free `cms.config.ts`).
 */
export const SCHEMA_PARTITION_CONVENTION = CMS_CONFIG_CONVENTION;

/** Vite-only live components catalog (optional; empty map when absent). */
export const CMS_COMPONENTS_CONVENTION = [
	"src/cms.components.ts",
	"src/cms.components.mjs",
	"src/cms.components.js",
] as const;

/** Convention paths for Astro content collections (ADR-0004 / 0016). */
export const CONTENT_CONFIG_CONVENTION = [
	"src/content.config.ts",
	"src/content.config.mjs",
	"src/content.config.js",
] as const;

/** Default write-back root relative to the Astro project root. */
export const DEFAULT_CONTENT_ROOT = "src/content";

export type CmsConfigVitePluginOptions = {
	/** Absolute path to the Node-safe unified tree module. */
	entry: string;
};

export type CmsComponentsVitePluginOptions = {
	/**
	 * Absolute path to the Vite-only components catalog, or omit for an empty
	 * default export (stock editors only).
	 */
	entry?: string;
};

export type CmsHostVitePluginOptions = {
	/** Absolute path to the module that exports `createHost`. */
	entry: string;
};

export type CmsSchemaPartitionVitePluginOptions = {
	/** Absolute path to the Svelte-free schema partition (`cms.config`). */
	entry: string;
};

export type CmsIntegrationOptionsVitePluginOptions = {
	mount: string;
	allowInProd?: boolean;
	/** Absolute filesystem root for write-back (default host). */
	contentRoot: string;
};

/** Minimal Vite plugin shape (avoid depending on `vite` types in this package). */
export type CmsVitePlugin = {
	name: string;
	enforce?: "pre" | "post";
	resolveId: (
		id: string,
	) => string | null | undefined | Promise<string | null | undefined>;
	load: (
		id: string,
	) => string | null | undefined | Promise<string | null | undefined>;
};

/**
 * Resolve a project-relative or absolute module path against the
 * Astro/Vite project root.
 */
export function resolveProjectEntry(
	entry: string,
	projectRoot: string,
): string {
	return path.isAbsolute(entry) ? entry : path.resolve(projectRoot, entry);
}

/** @deprecated Prefer {@link resolveProjectEntry}. */
export const resolveEditorConfigEntry = resolveProjectEntry;

/** First existing convention file under the project root, if any. */
export function resolveConventionEntry(
	projectRoot: string,
	candidates: readonly string[],
): string | undefined {
	for (const rel of candidates) {
		const abs = path.resolve(projectRoot, rel);
		if (fs.existsSync(abs)) return abs;
	}
	return undefined;
}

/**
 * Expose `virtual:@cms/config` as a static re-export of `entry`.
 * Entry must be Svelte-free (string catalog keys only).
 */
export function cmsConfigVitePlugin(
	options: CmsConfigVitePluginOptions,
): CmsVitePlugin {
	const entry = path.normalize(options.entry);
	// JSON.stringify keeps Windows paths and escapes safe inside generated source.
	const entryLiteral = JSON.stringify(entry);

	return {
		name: "@cms/astro:virtual-config",
		enforce: "pre",
		resolveId(id) {
			if (id === CMS_CONFIG_VIRTUAL_ID) return CMS_CONFIG_RESOLVED_ID;
			return null;
		},
		load(id) {
			if (id !== CMS_CONFIG_RESOLVED_ID) return null;
			return [
				`export { collections, default } from ${entryLiteral};`,
				`export * from ${entryLiteral};`,
			].join("\n");
		},
	};
}

/**
 * Expose `virtual:@cms/components` as the live Svelte catalog (or `{}`).
 */
export function cmsComponentsVitePlugin(
	options: CmsComponentsVitePluginOptions = {},
): CmsVitePlugin {
	const entry =
		options.entry != null ? path.normalize(options.entry) : undefined;
	const entryLiteral = entry != null ? JSON.stringify(entry) : null;

	return {
		name: "@cms/astro:virtual-components",
		enforce: "pre",
		resolveId(id) {
			if (id === CMS_COMPONENTS_VIRTUAL_ID) return CMS_COMPONENTS_RESOLVED_ID;
			return null;
		},
		load(id) {
			if (id !== CMS_COMPONENTS_RESOLVED_ID) return null;
			if (entryLiteral == null) {
				return "export default {};\n";
			}
			return `export { default } from ${entryLiteral};\n`;
		},
	};
}

/**
 * Expose `virtual:@cms/host` as a re-export of `createHost`.
 * Loaded by the package-owned Astro middleware entrypoint at request time.
 */
export function cmsHostVitePlugin(
	options: CmsHostVitePluginOptions,
): CmsVitePlugin {
	const entry = path.normalize(options.entry);
	const entryLiteral = JSON.stringify(entry);

	return {
		name: "@cms/astro:virtual-host",
		enforce: "pre",
		resolveId(id) {
			if (id === CMS_HOST_VIRTUAL_ID) return CMS_HOST_RESOLVED_ID;
			return null;
		},
		load(id) {
			if (id !== CMS_HOST_RESOLVED_ID) return null;
			return `export { createHost } from ${entryLiteral};\n`;
		},
	};
}

/**
 * Expose `virtual:@cms/schema-partition` for the CMS-first default host.
 * Partition must export Svelte-free `collections` (typically `cms.config.ts`).
 */
export function cmsSchemaPartitionVitePlugin(
	options: CmsSchemaPartitionVitePluginOptions,
): CmsVitePlugin {
	const entry = path.normalize(options.entry);
	const entryLiteral = JSON.stringify(entry);

	return {
		name: "@cms/astro:virtual-schema-partition",
		enforce: "pre",
		resolveId(id) {
			if (id === CMS_SCHEMA_PARTITION_VIRTUAL_ID) {
				return CMS_SCHEMA_PARTITION_RESOLVED_ID;
			}
			return null;
		},
		load(id) {
			if (id !== CMS_SCHEMA_PARTITION_RESOLVED_ID) return null;
			return `export { collections } from ${entryLiteral};\n`;
		},
	};
}

/**
 * Expose serializable integration options to the middleware / default host.
 */
export function cmsIntegrationOptionsVitePlugin(
	options: CmsIntegrationOptionsVitePluginOptions,
): CmsVitePlugin {
	const mountLiteral = JSON.stringify(options.mount);
	const allowInProdLiteral = JSON.stringify(options.allowInProd);
	const contentRootLiteral = JSON.stringify(options.contentRoot);

	return {
		name: "@cms/astro:virtual-integration-options",
		enforce: "pre",
		resolveId(id) {
			if (id === CMS_INTEGRATION_OPTIONS_VIRTUAL_ID) {
				return CMS_INTEGRATION_OPTIONS_RESOLVED_ID;
			}
			return null;
		},
		load(id) {
			if (id !== CMS_INTEGRATION_OPTIONS_RESOLVED_ID) return null;
			return [
				`export const mount = ${mountLiteral};`,
				`export const allowInProd = ${allowInProdLiteral};`,
				`export const contentRoot = ${contentRootLiteral};`,
			].join("\n");
		},
	};
}
