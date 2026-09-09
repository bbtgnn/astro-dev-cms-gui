/**
 * PROTOTYPE / SPIKE — @cms/routes
 * Consumer install root. Dispatcher + Track C middleware / integration seam.
 */

export { cmsDevOnlyGuard } from "./dev-guard";
export {
	type CmsDispatcherOptions,
	createCmsDispatcher,
} from "./dispatcher";
export {
	type CmsIntegration,
	type CmsMiddlewareContext,
	type CmsMiddlewareHandler,
	type CmsMiddlewareNext,
	createCmsIntegration,
	createCmsMiddleware,
} from "./middleware";
