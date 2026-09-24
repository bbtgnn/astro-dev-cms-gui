/**
 * Consumer middleware helper for the CMS protocol transport (escape hatch).
 *
 * Prefer `@cms/astro` `cms()` which injects a catch-all route at the API mount.
 * Use this when composing middleware manually (tests / advanced hosts):
 *
 * ```ts
 * import { defineMiddleware } from "astro:middleware";
 * import { createCmsMiddleware } from "@cms/astro";
 *
 * export const onRequest = defineMiddleware(
 *   createCmsMiddleware({ protocol, isDev: import.meta.env.DEV }),
 * );
 * ```
 */
import {
	type CmsDispatcherOptions,
	createCmsDispatcher,
	DEFAULT_CMS_API_MOUNT,
} from "@cms/core/http";

export type { CmsDispatcherOptions };

/** Minimal Astro middleware context shape (avoid importing astro:middleware here). */
export type CmsMiddlewareContext = {
	request: Request;
	url: URL;
};

export type CmsMiddlewareNext = () => Promise<Response> | Response;

export type CmsMiddlewareHandler = (
	context: CmsMiddlewareContext,
	next: CmsMiddlewareNext,
) => Promise<Response>;

export function createCmsMiddleware(
	options: CmsDispatcherOptions,
): CmsMiddlewareHandler {
	const mount =
		(options.mount ?? DEFAULT_CMS_API_MOUNT).replace(/\/+$/, "") ||
		DEFAULT_CMS_API_MOUNT;
	const dispatch = createCmsDispatcher({ ...options, mount });

	return async function cmsMiddleware(context, next) {
		const { pathname } = context.url;
		if (pathname !== mount && !pathname.startsWith(`${mount}/`)) {
			return await next();
		}

		const rest = pathname.slice(mount.length).replace(/^\//, "");
		const segments = rest.length ? rest.split("/") : [];
		return dispatch(context.request, segments);
	};
}
