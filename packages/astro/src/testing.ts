/**
 * Test / non-convention escapes for `@cms/astro` (ADR-0016).
 *
 * Prefer zero-arg `cms()` from `@cms/astro` for real hosts.
 * Use this module only in fixtures and advanced layouts.
 *
 * {@link buildDefaultFsHost} — IR / editor collections → CmsHost without Vite
 * (memoryWriter + injectable fileExists). Quarantined until ticket 08.
 *
 * {@link buildFsHostFromStampedCollections} — stamped content.config collections
 * → CmsHost (product `cms()` default path).
 */

export {
	type BuildDefaultFsHostOptions,
	buildDefaultFsHost,
} from "./build-default-fs-host";
export {
	type BuildFsHostFromStampedOptions,
	type BuildFsHostFromStampedResult,
	type CollectionLocationOverride,
	type MaterializedStampedCollection,
	type StampedCollectionConfig,
	buildFsHostFromStampedCollections,
	collectionsFromContentConfigExport,
} from "./build-fs-host-from-stamped";
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
