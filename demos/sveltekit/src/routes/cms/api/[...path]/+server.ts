/**
 * Catch-all protocol transport at /cms/api.
 * (SvelteKit rest segments are always optional — use `[...path]`, not `[[...path]]`.)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCmsHttpFromConfig, DEFAULT_CMS_API_MOUNT } from "@cms/core/http";
import { nodeFsWriter } from "@cms/core/node";
import type { RequestHandler } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { cmsConfig } from "$lib/cms";

const contentRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../../../data",
);

const { dispatch } = createCmsHttpFromConfig({
	config: cmsConfig,
	root: contentRoot,
	writer: nodeFsWriter(),
	isDev: dev,
	mount: DEFAULT_CMS_API_MOUNT,
});

function segmentsFromParam(pathParam: string | undefined): string[] {
	if (pathParam == null || pathParam === "") return [];
	return pathParam.split("/").filter(Boolean);
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
