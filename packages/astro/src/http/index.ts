/**
 * HTTP transport for the CMS protocol (dispatcher + middleware).
 * Field schemas and protocol construction live in `@cms/core`.
 */

export {
	type AdaptImageOptions,
	type AdaptReferenceOptions,
	adaptImage,
	adaptReference,
} from "./adapt";
export { cmsDevOnlyGuard } from "./dev-guard";
export {
	type CmsDispatcherOptions,
	createCmsDispatcher,
} from "./dispatcher";
export {
	type CmsMiddlewareContext,
	type CmsMiddlewareHandler,
	type CmsMiddlewareNext,
	createCmsMiddleware,
} from "./middleware";
