/**
 * HTTP transport for the CMS protocol (dispatcher + dev guard).
 * Protocol construction lives beside this module; hosts mount the dispatcher.
 */

export { cmsDevOnlyGuard } from "./dev-guard";
export {
	type CmsDispatcherOptions,
	createCmsDispatcher,
	DEFAULT_CMS_API_MOUNT,
} from "./dispatcher";
