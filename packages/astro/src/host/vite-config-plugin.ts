/**
 * Vite virtual modules for the Astro host integration:
 * - `virtual:@cms/content-config` — user `content.config` (host/SSR only)
 * - `virtual:@cms/config` — optional overlay (`cms.config.ts`); stub when absent
 * - `virtual:@cms/components` — Vite-only live Svelte catalog (`cms.components.ts`)
 * - `virtual:@cms/host` — `createHost()` factory (package default or override)
 * - `virtual:@cms/integration-options` — mount / allowInProd / contentRoot
 *
 * Catalog values stay live module bindings in the host Vite graph —
 * they are never serialized through Astro props or the CMS protocol.
 * Virtual IDs are package-internal; consumers do not import them.
 * Browser shell must not import `virtual:@cms/content-config` (ADR-0008).
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

export const CMS_CONTENT_CONFIG_VIRTUAL_ID = "virtual:@cms/content-config";
const CMS_CONTENT_CONFIG_RESOLVED_ID = `\0${CMS_CONTENT_CONFIG_VIRTUAL_ID}`;

export const CMS_CONFIG_VIRTUAL_ID = "virtual:@cms/config";
const CMS_CONFIG_RESOLVED_ID = `\0${CMS_CONFIG_VIRTUAL_ID}`;

export const CMS_COMPONENTS_VIRTUAL_ID = "virtual:@cms/components";
const CMS_COMPONENTS_RESOLVED_ID = `\0${CMS_COMPONENTS_VIRTUAL_ID}`;

export const CMS_HOST_VIRTUAL_ID = "virtual:@cms/host";
const CMS_HOST_RESOLVED_ID = `\0${CMS_HOST_VIRTUAL_ID}`;

export const CMS_INTEGRATION_OPTIONS_VIRTUAL_ID =
	"virtual:@cms/integration-options";
const CMS_INTEGRATION_OPTIONS_RESOLVED_ID = `\0${CMS_INTEGRATION_OPTIONS_VIRTUAL_ID}`;

export type CmsContentConfigVitePluginOptions = {
	entry: string;
};

export type CmsConfigVitePluginOptions = {
	entry?: string;
};

export type CmsComponentsVitePluginOptions = {
	entry?: string;
};

export type CmsHostVitePluginOptions = {
	entry: string;
};

export type CmsIntegrationOptionsVitePluginOptions = {
	mount: string;
	allowInProd?: boolean;
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

export function cmsContentConfigVitePlugin(
	options: CmsContentConfigVitePluginOptions,
): CmsVitePlugin {
	const entry = path.normalize(options.entry);
	const entryLiteral = JSON.stringify(entry);

	return {
		name: "@cms/astro:virtual-content-config",
		enforce: "pre",
		resolveId(id) {
			if (id === CMS_CONTENT_CONFIG_VIRTUAL_ID) {
				return CMS_CONTENT_CONFIG_RESOLVED_ID;
			}
			return null;
		},
		load(id) {
			if (id !== CMS_CONTENT_CONFIG_RESOLVED_ID) return null;
			return [
				`export { collections } from ${entryLiteral};`,
				`export * from ${entryLiteral};`,
			].join("\n");
		},
	};
}

export function cmsConfigVitePlugin(
	options: CmsConfigVitePluginOptions = {},
): CmsVitePlugin {
	const entry =
		options.entry != null ? path.normalize(options.entry) : undefined;
	const entryLiteral = entry != null ? JSON.stringify(entry) : null;

	return {
		name: "@cms/astro:virtual-config",
		enforce: "pre",
		resolveId(id) {
			if (id === CMS_CONFIG_VIRTUAL_ID) return CMS_CONFIG_RESOLVED_ID;
			return null;
		},
		load(id) {
			if (id !== CMS_CONFIG_RESOLVED_ID) return null;
			if (entryLiteral == null) {
				return [
					"export const forms = {};",
					"export const types = {};",
					"export function getPreviewUrl(_collection, _id) { return null; }",
					"export default { forms, types, getPreviewUrl };",
				].join("\n");
			}
			// Prefer default export (defineAstroCms result); named exports are legacy fallback.
			return [
				`import * as __cmsConfig from ${entryLiteral};`,
				"const __cfg = __cmsConfig.default ?? __cmsConfig;",
				"export const forms = __cfg.forms ?? {};",
				"export const types = __cfg.types ?? {};",
				"export const getPreviewUrl =",
				"  __cfg.getPreviewUrl ?? ((_collection, _id) => null);",
				"export default __cfg;",
			].join("\n");
		},
	};
}

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
