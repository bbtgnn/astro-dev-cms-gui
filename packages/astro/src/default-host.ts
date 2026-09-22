/**
 * Package default CmsHost — Vite adapter over {@link buildDefaultFsHost}.
 *
 * Reads editor configuration and content root from virtual modules, injects
 * Node FS Writer + fileExists, then delegates assembly (ADR-0016 / 0019 / 0020).
 */

import fs from "node:fs";
import { collections as editorCollections } from "virtual:@cms/config";
import { contentRoot } from "virtual:@cms/integration-options";
import { type CmsHost, nodeFsWriter } from "@cms/core";
import { buildDefaultFsHost } from "./build-default-fs-host";

function nodeFileExists(absPath: string): boolean {
	try {
		return fs.existsSync(absPath) && fs.statSync(absPath).isFile();
	} catch {
		return false;
	}
}

export function createHost(): CmsHost {
	return buildDefaultFsHost({
		collections: editorCollections,
		contentRoot,
		writer: nodeFsWriter(),
		fileExists: nodeFileExists,
	});
}
