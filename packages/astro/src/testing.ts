/**
 * Test / non-convention escapes for `@cms/astro` (ADR-0016).
 *
 * Prefer zero-arg `cms()` from `@cms/astro` for real hosts.
 * Use this module only in fixtures and advanced layouts.
 *
 * {@link assembleStampedCms} — stamped collections → paired CmsHost + form models
 * (package-default path). {@link buildFsHostFromStampedCollections} — host-only.
 */

export {
	type AssembleStampedCmsOptions,
	type AssembleStampedCmsResult,
	assembleStampedCms,
} from "./assemble-stamped-cms";
export {
	type BuildFsHostFromStampedOptions,
	type BuildFsHostFromStampedResult,
	buildFsHostFromStampedCollections,
	type CollectionLocationOverride,
	collectionsFromContentConfigExport,
	type MaterializedStampedCollection,
	materializeSchema,
	type StampedCollectionConfig,
} from "./build-fs-host-from-stamped";
export {
	CMS_COLLECTION_TYPES_FILENAME,
	printCollectionTypesFile,
} from "./codegen/emit-collection-types";
export { syncCmsCollectionTypes } from "./codegen/sync-collection-types";
export { cmsCollectionTypesVitePlugin } from "./codegen/vite-collection-types-plugin";
export { printZodInputType } from "./codegen/zod-input-type";
export {
	type CmsHarnessOptions,
	type CmsIntegration,
	cmsHarness,
	createCmsIntegration,
} from "./integration";
export {
	CMS_COMPONENTS_CONVENTION,
	CMS_COMPONENTS_VIRTUAL_ID,
	CMS_CONFIG_CONVENTION,
	CMS_CONFIG_VIRTUAL_ID,
	CMS_CONTENT_CONFIG_VIRTUAL_ID,
	CMS_HOST_VIRTUAL_ID,
	CMS_INTEGRATION_OPTIONS_VIRTUAL_ID,
	type CmsComponentsVitePluginOptions,
	type CmsConfigVitePluginOptions,
	type CmsContentConfigVitePluginOptions,
	type CmsHostVitePluginOptions,
	type CmsIntegrationOptionsVitePluginOptions,
	type CmsVitePlugin,
	CONTENT_CONFIG_CONVENTION,
	cmsComponentsVitePlugin,
	cmsConfigVitePlugin,
	cmsContentConfigVitePlugin,
	cmsHostVitePlugin,
	cmsIntegrationOptionsVitePlugin,
	DEFAULT_CONTENT_ROOT,
	resolveConventionEntry,
	resolveEditorConfigEntry,
	resolveProjectEntry,
	SCHEMA_PARTITION_CONVENTION,
} from "./vite-config-plugin";
