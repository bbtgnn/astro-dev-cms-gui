/**
 * Convention paths for the Astro host install surface (schema-first exploration).
 *
 * content.config is user-authored (required for product cms()).
 * cms.config / cms.components are optional overlay + catalog.
 */

export const CMS_CONFIG_CONVENTION = [
	"src/cms.config.ts",
	"src/cms.config.mjs",
	"src/cms.config.js",
] as const;

export const CMS_COMPONENTS_CONVENTION = [
	"src/cms.components.ts",
	"src/cms.components.mjs",
	"src/cms.components.js",
] as const;

export const CONTENT_CONFIG_CONVENTION = [
	"src/content.config.ts",
	"src/content.config.mjs",
	"src/content.config.js",
] as const;

export const DEFAULT_CONTENT_ROOT = "src/content";
