/**
 * HTTP transport for the CMS protocol.
 * Dispatcher lives in `@cms/core/http`; this package re-exports it and adds
 * Astro middleware as an escape hatch (product `cms()` injects a route).
 */

export {
	type CmsDispatcherOptions,
	cmsDevOnlyGuard,
	createCmsDispatcher,
	DEFAULT_CMS_API_MOUNT,
} from "@cms/core/http";
export {
	type CmsMiddlewareContext,
	type CmsMiddlewareHandler,
	type CmsMiddlewareNext,
	createCmsMiddleware,
} from "./middleware";
