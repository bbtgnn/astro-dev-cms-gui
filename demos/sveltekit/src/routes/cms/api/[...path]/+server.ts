/**
 * Catch-all protocol transport at /cms/api.
 * Optional rest so /cms/api and /cms/api/ok both hit the dispatcher.
 * (SvelteKit rest segments are always optional — use `[...path]`, not `[[...path]]`.)
 */
import { createCmsDispatcher, DEFAULT_CMS_API_MOUNT } from "@cms/core/http";
import type { RequestHandler } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { cmsHost } from "$lib/cms-host.server";

const dispatch = createCmsDispatcher({
	protocol: cmsHost.protocol,
	readAsset: (rel) => cmsHost.readAsset(rel),
	isDev: dev,
	mount: DEFAULT_CMS_API_MOUNT,
});

function segmentsFromParam(path: string | undefined): string[] {
	if (path == null || path === "") return [];
	return path.split("/").filter(Boolean);
}

const handle: RequestHandler = ({ request, params }) =>
	dispatch(request, segmentsFromParam(params.path as string | undefined));

export const GET = handle;
export const PUT = handle;
export const POST = handle;
export const DELETE = handle;
export const PATCH = handle;
export const OPTIONS = handle;
export const HEAD = handle;
