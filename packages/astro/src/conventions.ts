/**
 * Convention paths for the Astro host install surface (schema-first exploration).
 *
 * content.config is user-authored (required for product cms()).
 * cms.config / cms.components are optional overlay + catalog.
 */

/** Convention paths for the Node-safe unified tree (and schema partition). */
export const CMS_CONFIG_CONVENTION = [
	"src/cms.config.ts",
	"src/cms.config.mjs",
	"src/cms.config.js",
] as const;

/**
 * Primary schema-partition / cms.config path — generate + CLI default.
 * Same module as the first {@link CMS_CONFIG_CONVENTION} candidate.
 */
export const SCHEMA_PARTITION_CONVENTION = CMS_CONFIG_CONVENTION[0];

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
