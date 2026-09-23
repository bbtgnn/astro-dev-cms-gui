/**
 * @cms/astro — Astro host product face (ADR-0016).
 *
 * Happy path: zero-arg `cms()`. Protocol-only escapes stay here.
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
