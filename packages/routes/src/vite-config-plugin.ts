/**
 * Vite virtual module that statically re-exports the host project's
 * browser-safe editor configuration (`virtual:@cms/config`).
 *
 * Direct Svelte components stay live module values in the host graph —
 * they are never serialized through Astro props or the CMS protocol.
 */
import path from "node:path";

export const CMS_CONFIG_VIRTUAL_ID = "virtual:@cms/config";
const CMS_CONFIG_RESOLVED_ID = `\0${CMS_CONFIG_VIRTUAL_ID}`;

export type CmsConfigVitePluginOptions = {
	/** Absolute path to the browser-safe editor configuration module. */
	entry: string;
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
 * Resolve a project-relative or absolute editor-config path against the
 * Astro/Vite project root.
 */
export function resolveEditorConfigEntry(
	entry: string,
	projectRoot: string,
): string {
	return path.isAbsolute(entry) ? entry : path.resolve(projectRoot, entry);
}

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
