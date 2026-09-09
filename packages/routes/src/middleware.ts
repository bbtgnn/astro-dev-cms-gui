/**
 * PROTOTYPE / SPIKE — Track C consumer mount seam.
 *
 * Consumer wires this once in `src/middleware.ts`:
 *
 * ```ts
 * import { defineMiddleware } from "astro:middleware";
 * import { createCmsMiddleware } from "@cms/routes";
 *
 * export const onRequest = defineMiddleware(
 *   createCmsMiddleware({ writeMode, isDev: import.meta.env.DEV, mount: "/_cms" }),
 * );
 * ```
 *
 * Astro ignores `src/pages/_…`, so `/_cms` stays middleware-mounted.
 * Full `addMiddleware` Astro integration entrypoint is deferred.
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

export type CmsIntegration = {
	name: "@cms/routes";
	/** Mount prefix without trailing slash (default `/_cms`). */
	mount: string;
	/** Pass to `defineMiddleware(...)`. */
	middleware: CmsMiddlewareHandler;
};

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

/**
 * Named install object for the consumer surface.
 * Today: exposes `middleware` for `defineMiddleware`.
 * Later: may grow an Astro `hooks['astro:config:setup']` addMiddleware entrypoint.
 */
export function createCmsIntegration(
	options: CmsDispatcherOptions,
): CmsIntegration {
	const mount = (options.mount ?? "/_cms").replace(/\/+$/, "") || "/_cms";
	return {
		name: "@cms/routes",
		mount,
		middleware: createCmsMiddleware({ ...options, mount }),
	};
}
