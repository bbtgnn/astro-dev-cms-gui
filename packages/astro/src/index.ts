/**
 * @cms/astro — Astro host integration (dev-mode shell + protocol transport).
 */
export {
	type CmsIntegration,
	type CmsIntegrationOptions,
	cms,
	createCmsIntegration,
} from "./integration";
export {
	CMS_CONFIG_VIRTUAL_ID,
	CMS_HOST_VIRTUAL_ID,
	CMS_INTEGRATION_OPTIONS_VIRTUAL_ID,
	type CmsConfigVitePluginOptions,
	type CmsHostVitePluginOptions,
	type CmsIntegrationOptionsVitePluginOptions,
	type CmsVitePlugin,
	cmsConfigVitePlugin,
	cmsHostVitePlugin,
	cmsIntegrationOptionsVitePlugin,
	resolveEditorConfigEntry,
	resolveProjectEntry,
} from "./vite-config-plugin";
