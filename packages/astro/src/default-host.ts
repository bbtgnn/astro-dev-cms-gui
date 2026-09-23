/**
 * Package default CmsHost — Vite adapter over stamped content.config.
 *
 * Reads collections from `virtual:@cms/content-config` (content-proxy stamps
 * active on the host Vite graph), injects Node FS Writer + fileExists, then
 * {@link buildFsHostFromStampedCollections}.
 */

import fs from "node:fs";
import { collections } from "virtual:@cms/content-config";
import { contentRoot } from "virtual:@cms/integration-options";
import { type CmsHost, nodeFsWriter } from "@cms/core";
import {
	type StampedCollectionConfig,
	buildFsHostFromStampedCollections,
	collectionsFromContentConfigExport,
} from "./build-fs-host-from-stamped";

function nodeFileExists(absPath: string): boolean {
	try {
		return fs.existsSync(absPath) && fs.statSync(absPath).isFile();
	} catch {
		return false;
	}
}

export function createHost(): CmsHost {
	const { host } = buildFsHostFromStampedCollections({
		collections: collectionsFromContentConfigExport({
			collections: collections as Readonly<
				Record<string, StampedCollectionConfig>
			>,
		}),
		contentRoot,
		writer: nodeFsWriter(),
		fileExists: nodeFileExists,
	});
	return host;
}
