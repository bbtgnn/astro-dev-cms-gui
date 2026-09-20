/**
 * Package default CmsHost factory — legacy FieldUi discovery path.
 * Used when the project has no `src/cms.config.ts` partition.
 * Prefer {@link ./default-host-semantic.ts} when a schema partition exists.
 *
 * Discovers collections from the project's `content.config` and writes under
 * the configured content root (default `src/content`).
 */

import { collections } from "virtual:@cms/content-config";
import { contentRoot } from "virtual:@cms/integration-options";
import {
	type CmsHost,
	createCmsHost,
	discoverCollections,
	nodeFsWriter,
} from "@cms/core";

export function createHost(): CmsHost {
	const discovered = discoverCollections(collections);
	const allowPaths = [
		...new Set(discovered.map((collection) => collection.base)),
	];

	return createCmsHost({
		root: contentRoot,
		allowPaths,
		writer: nodeFsWriter(),
		collections: discovered,
	});
}
