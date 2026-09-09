/**
 * PROTOTYPE / SPIKE — @cms/routes
 * Consumer install root. Pass 0–2: HTTP dispatcher for /_cms/[...path].
 */
export { createCmsDispatcher, type CmsDispatcherOptions } from "./dispatcher.ts";
export { cmsDevOnlyGuard } from "./dev-guard.ts";
