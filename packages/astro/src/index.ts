/**
 * @cms/astro — Astro host integration (dev-mode shell + protocol transport).
 */

export {
	type CmsDispatcherOptions,
	type CmsMiddlewareContext,
	type CmsMiddlewareHandler,
	type CmsMiddlewareNext,
	cmsDevOnlyGuard,
	createCmsDispatcher,
	createCmsMiddleware,
} from "./http";
export {
	type CmsHarnessOptions,
	type CmsIntegration,
	type CmsIntegrationOptions,
	cms,
	cmsHarness,
	createCmsIntegration,
} from "./integration";
export {
	CMS_COMPONENTS_CONVENTION,
	CMS_COMPONENTS_VIRTUAL_ID,
	CMS_CONFIG_CONVENTION,
	CMS_CONFIG_VIRTUAL_ID,
	CMS_HOST_VIRTUAL_ID,
	CMS_INTEGRATION_OPTIONS_VIRTUAL_ID,
	type CmsComponentsVitePluginOptions,
	type CmsConfigVitePluginOptions,
	type CmsHostVitePluginOptions,
	type CmsIntegrationOptionsVitePluginOptions,
	type CmsVitePlugin,
	CONTENT_CONFIG_CONVENTION,
	cmsComponentsVitePlugin,
	cmsConfigVitePlugin,
	cmsHostVitePlugin,
	cmsIntegrationOptionsVitePlugin,
	DEFAULT_CONTENT_ROOT,
	resolveConventionEntry,
	resolveEditorConfigEntry,
	resolveProjectEntry,
	SCHEMA_PARTITION_CONVENTION,
} from "./vite-config-plugin";
