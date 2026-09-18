/**
 * Vite virtual modules for the Astro host integration:
 * - `virtual:@cms/config` — browser-safe editor configuration
 * - `virtual:@cms/host` — project `createHost()` factory (server middleware)
 * - `virtual:@cms/integration-options` — mount / allowInProd for the entrypoint
 *
 * Direct Svelte components stay live module values in the host graph —
 * they are never serialized through Astro props or the CMS protocol.
 */
import path from "node:path";

export const CMS_CONFIG_VIRTUAL_ID = "virtual:@cms/config";
const CMS_CONFIG_RESOLVED_ID = `\0${CMS_CONFIG_VIRTUAL_ID}`;

export const CMS_HOST_VIRTUAL_ID = "virtual:@cms/host";
const CMS_HOST_RESOLVED_ID = `\0${CMS_HOST_VIRTUAL_ID}`;

export const CMS_INTEGRATION_OPTIONS_VIRTUAL_ID =
	"virtual:@cms/integration-options";
const CMS_INTEGRATION_OPTIONS_RESOLVED_ID = `\0${CMS_INTEGRATION_OPTIONS_VIRTUAL_ID}`;

export type CmsConfigVitePluginOptions = {
	/** Absolute path to the browser-safe editor configuration module. */
	entry: string;
};

export type CmsHostVitePluginOptions = {
	/** Absolute path to the project module that exports `createHost`. */
	entry: string;
};

export type CmsIntegrationOptionsVitePluginOptions = {
	mount: string;
	allowInProd?: boolean;
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

/**
 * Expose `virtual:@cms/config` as a static re-export of `entry`.
 * Vite HMR follows the real module (and its Svelte imports) automatically.
 */
export function cmsConfigVitePlugin(
	options: CmsConfigVitePluginOptions,
): CmsVitePlugin {
	const entry = path.normalize(options.entry);
	// JSON.stringify keeps Windows paths and escapes safe inside generated source.
	const entryLiteral = JSON.stringify(entry);

	return {
		name: "@cms/routes:virtual-config",
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
 * Expose `virtual:@cms/host` as a re-export of the project's `createHost`.
 * Loaded by the package-owned Astro middleware entrypoint at request time.
 */
export function cmsHostVitePlugin(
	options: CmsHostVitePluginOptions,
): CmsVitePlugin {
	const entry = path.normalize(options.entry);
	const entryLiteral = JSON.stringify(entry);

	return {
		name: "@cms/routes:virtual-host",
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
 * Expose serializable integration options to the middleware entrypoint.
 */
export function cmsIntegrationOptionsVitePlugin(
	options: CmsIntegrationOptionsVitePluginOptions,
): CmsVitePlugin {
	const mountLiteral = JSON.stringify(options.mount);
	const allowInProdLiteral = JSON.stringify(options.allowInProd);

	return {
		name: "@cms/routes:virtual-integration-options",
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
			].join("\n");
		},
	};
}
