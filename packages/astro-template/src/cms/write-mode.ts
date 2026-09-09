/**
 * Template write-mode — live `content.config` discovery (P2).
 * Happy path: no fakeCatalog; pathMap only for Track D allowlist deny smoke.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	createWriteMode,
	discoverCollections,
	memoryWriter,
	nodeFsWriter,
} from "@cms/crud";
import { collections } from "../content.config";

const here = path.dirname(fileURLToPath(import.meta.url));
export const contentRoot = path.resolve(here, "../../content-sandbox");

/** Allowlisted write roots (under content-sandbox only). */
export const allowPaths = ["posts", "authors", "data"];

const discovered = discoverCollections(collections);

export function createTemplateWriteMode(opts?: { useMemory?: boolean }) {
	const writer = opts?.useMemory ? memoryWriter() : nodeFsWriter();

	return createWriteMode({
		root: contentRoot,
		allowPaths,
		writer,
		collections: discovered,
		// Track D: mapped path outside allowPaths → HTTP 403
		pathMap: {
			posts: {
				blocked: "../blocked.yaml",
			},
		},
	});
}
