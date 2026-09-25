/**
 * Package default CmsHost — Vite adapter over stamped CMS assemble.
 *
 * Reads collections from `virtual:@cms/content-config` (content-proxy stamps
 * active on the host Vite graph), injects Node FS Writer + fileExists, then
 * {@link assembleStampedCms} (host field only).
 */

import fs from "node:fs";
import { collections } from "virtual:@cms/content-config";
import { contentRoot } from "virtual:@cms/integration-options";
import type { CmsHost } from "@cms/core";
import { nodeFsWriter } from "@cms/core/node";
import { assembleStampedCms } from "../stamped/assemble-stamped-cms";
import type { StampedCollectionConfig } from "../stamped/build-fs-host-from-stamped";

function nodeFileExists(absPath: string): boolean {
	try {
		return fs.existsSync(absPath) && fs.statSync(absPath).isFile();
	} catch {
		return false;
	}
}

export function createHost(): CmsHost {
	const { host } = assembleStampedCms({
		collections: collections as Readonly<
			Record<string, StampedCollectionConfig>
		>,
		contentRoot,
		writer: nodeFsWriter(),
		fileExists: nodeFileExists,
	});
	return host;
}
