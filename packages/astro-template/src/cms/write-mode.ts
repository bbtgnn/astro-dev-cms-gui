/**
 * Template CMS host — live `content.config` discovery behind createCmsHost.
 * Happy path: no fakeCatalog; pathMap only for Track D allowlist deny smoke.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	type CmsHost,
	createCmsHost,
	discoverCollections,
	memoryWriter,
	nodeFsWriter,
} from "@cms/crud";
import { processImageToWebpSizes } from "../../../routes/src/process-image.ts";
import { collections } from "../content.config";

const here = path.dirname(fileURLToPath(import.meta.url));
export const contentRoot = path.resolve(here, "../../content-sandbox");

/** Allowlisted write roots (under content-sandbox only). */
export const allowPaths = ["posts", "authors", "data"];

const discovered = discoverCollections(collections);

/** Self-host protocol + host-only asset read for the Astro `/_cms` transport. */
export function createTemplateCmsHost(opts?: { useMemory?: boolean }): CmsHost {
	const writer = opts?.useMemory ? memoryWriter() : nodeFsWriter();

	return createCmsHost({
		root: contentRoot,
		allowPaths,
		writer,
		collections: discovered,
		processImage: processImageToWebpSizes,
		// Track D: mapped path outside allowPaths → HTTP 403 / protocol forbidden
		pathMap: {
			posts: {
				blocked: "../blocked.yaml",
			},
		},
	});
}
