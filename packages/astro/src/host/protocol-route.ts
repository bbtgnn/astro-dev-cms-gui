/**
 * Package-owned protocol catch-all endpoint.
 * Injected via `cms()` at `{mount}/[...path]` (default `/cms/api`).
 *
 * Host construction: `createHost` from `virtual:@cms/host`.
 */

// Virtuals are provided by Vite plugins from createCmsIntegration.
import { createHost } from "virtual:@cms/host";
import { allowInProd, mount } from "virtual:@cms/integration-options";
import { createCmsDispatcher } from "@cms/core/http";
import type { APIRoute } from "astro";

export const prerender = false;

const host = createHost();
const dispatch = createCmsDispatcher({
	host,
	isDev: import.meta.env.DEV,
	allowInProd,
	mount,
});

function pathSegments(params: { path?: string | string[] }): string[] {
	const raw = params.path;
	if (raw == null || raw === "") return [];
	if (Array.isArray(raw))
		return raw.flatMap((p) => p.split("/")).filter(Boolean);
	return raw.split("/").filter(Boolean);
}

export const ALL: APIRoute = ({ params, request }) =>
	dispatch(request, pathSegments(params));
