/**
 * Template write-mode / CMS protocol — live `content.config` discovery (P2).
 * Happy path: no fakeCatalog; pathMap only for Track D allowlist deny smoke.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	adaptWriteModeToProtocol,
	type CmsProtocol,
	createWriteMode,
	discoverCollections,
	memoryWriter,
	nodeFsWriter,
	type WriteMode,
} from "@cms/crud";
import { processImageToWebpSizes } from "../../../routes/src/process-image.ts";
import { collections } from "../content.config";

const here = path.dirname(fileURLToPath(import.meta.url));
export const contentRoot = path.resolve(here, "../../content-sandbox");

/** Allowlisted write roots (under content-sandbox only). */
export const allowPaths = ["posts", "authors", "data"];

const discovered = discoverCollections(collections);

export function createTemplateWriteMode(opts?: {
	useMemory?: boolean;
}): WriteMode {
	const writer = opts?.useMemory ? memoryWriter() : nodeFsWriter();

	return createWriteMode({
		root: contentRoot,
		allowPaths,
		writer,
		collections: discovered,
		// Track D: mapped path outside allowPaths → HTTP 403 / protocol forbidden
		pathMap: {
			posts: {
				blocked: "../blocked.yaml",
			},
		},
	});
}

/** Self-host protocol seam used by the Astro `/_cms` transport. */
export function createTemplateCmsProtocol(opts?: {
	useMemory?: boolean;
}): CmsProtocol {
	return adaptWriteModeToProtocol(createTemplateWriteMode(opts), {
		processImage: processImageToWebpSizes,
	});
}
