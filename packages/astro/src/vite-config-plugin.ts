/**
 * Vite virtual modules for the Astro host integration:
 * - `virtual:@cms/config` — Node-safe unified tree (`cms.config.ts`); also the
 *   IR source for the package default CmsHost
 * - `virtual:@cms/components` — Vite-only live Svelte catalog (`cms.components.ts`)
 * - `virtual:@cms/host` — `createHost()` factory (package default or override)
 * - `virtual:@cms/integration-options` — mount / allowInProd / contentRoot
 *
 * Catalog values stay live module bindings in the host Vite graph —
 * they are never serialized through Astro props or the CMS protocol.
 * Virtual IDs are package-internal; consumers do not import them.
 */
import fs from "node:fs";
import path from "node:path";

export {
	CMS_COMPONENTS_CONVENTION,
	CMS_CONFIG_CONVENTION,
	CONTENT_CONFIG_CONVENTION,
	DEFAULT_CONTENT_ROOT,
	SCHEMA_PARTITION_CONVENTION,
} from "./conventions";

export const CMS_CONFIG_VIRTUAL_ID = "virtual:@cms/config";
const CMS_CONFIG_RESOLVED_ID = `\0${CMS_CONFIG_VIRTUAL_ID}`;

export const CMS_COMPONENTS_VIRTUAL_ID = "virtual:@cms/components";
const CMS_COMPONENTS_RESOLVED_ID = `\0${CMS_COMPONENTS_VIRTUAL_ID}`;

export const CMS_HOST_VIRTUAL_ID = "virtual:@cms/host";
const CMS_HOST_RESOLVED_ID = `\0${CMS_HOST_VIRTUAL_ID}`;

export const CMS_INTEGRATION_OPTIONS_VIRTUAL_ID =
	"virtual:@cms/integration-options";
const CMS_INTEGRATION_OPTIONS_RESOLVED_ID = `\0${CMS_INTEGRATION_OPTIONS_VIRTUAL_ID}`;

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
 * Shell and package default CmsHost both import this virtual.
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
