/**
 * @cms/astro — Astro host product face.
 *
 * Happy path: zero-arg `cms()` over user-authored content.config + optional overlay.
 * Harness / Vite plugin seams live under `@cms/astro/testing`.
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
	type CmsIntegration,
	type CmsIntegrationOptions,
	cms,
} from "./integration";
