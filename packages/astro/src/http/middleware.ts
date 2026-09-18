/**
 * Consumer middleware helper for the `/_cms` protocol transport.
 *
 * Prefer `@cms/astro` `cms()` for auto-mount (ADR-0016).
 * Use this when composing middleware manually (tests / advanced hosts):
 *
 * ```ts
 * import { defineMiddleware } from "astro:middleware";
 * import { createCmsMiddleware } from "@cms/astro";
 *
 * export const onRequest = defineMiddleware(
 *   createCmsMiddleware({ protocol, isDev: import.meta.env.DEV, mount: "/_cms" }),
 * );
 * ```
 *
 * Astro ignores `src/pages/_…`, so `/_cms` stays middleware-mounted.
 */
import { type CmsDispatcherOptions, createCmsDispatcher } from "./dispatcher";

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
	const mount = (options.mount ?? "/_cms").replace(/\/+$/, "") || "/_cms";
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
