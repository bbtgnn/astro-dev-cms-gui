/**
 * @cms/astro — Astro host product face.
 *
 * Happy path: zero-arg `cms()` over user-authored content.config + optional overlay.
 * Harness / Vite plugin seams live under `@cms/astro/testing`.
 */

export {
	type CmsIntegration,
	type CmsIntegrationOptions,
	cms,
} from "./host/integration";
export {
	type CmsDispatcherOptions,
	type CmsMiddlewareContext,
	type CmsMiddlewareHandler,
	type CmsMiddlewareNext,
	cmsDevOnlyGuard,
	createCmsDispatcher,
	createCmsMiddleware,
	DEFAULT_CMS_API_MOUNT,
} from "./http";
