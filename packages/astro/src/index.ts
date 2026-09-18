/**
 * @cms/astro — Astro host integration (dev-mode shell + protocol transport).
 */

export {
	type AdaptImageOptions,
	type AdaptReferenceOptions,
	adaptImage,
	adaptReference,
	type CmsDispatcherOptions,
	type CmsMiddlewareContext,
	type CmsMiddlewareHandler,
	type CmsMiddlewareNext,
	cmsDevOnlyGuard,
	createCmsDispatcher,
	createCmsMiddleware,
} from "./http";
export {
	type CmsIntegration,
	type CmsIntegrationOptions,
	cms,
	createCmsIntegration,
} from "./integration";
export {
	CMS_CONFIG_CONVENTION,
	CMS_CONFIG_VIRTUAL_ID,
	CMS_CONTENT_CONFIG_VIRTUAL_ID,
	CMS_HOST_VIRTUAL_ID,
	CMS_INTEGRATION_OPTIONS_VIRTUAL_ID,
	type CmsConfigVitePluginOptions,
	type CmsContentConfigVitePluginOptions,
	type CmsHostVitePluginOptions,
	type CmsIntegrationOptionsVitePluginOptions,
	type CmsVitePlugin,
	CONTENT_CONFIG_CONVENTION,
	cmsConfigVitePlugin,
	cmsContentConfigVitePlugin,
	cmsHostVitePlugin,
	cmsIntegrationOptionsVitePlugin,
	DEFAULT_CONTENT_ROOT,
	resolveConventionEntry,
	resolveEditorConfigEntry,
	resolveProjectEntry,
} from "./vite-config-plugin";
