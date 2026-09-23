/**
 * Server-only CmsHost — nodeFsWriter under ./data.
 * `.server.ts` keeps FS / Node out of the client bundle.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCmsHost, nodeFsWriter } from "@cms/core";
import { cmsConfig } from "./cms";

const contentRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../data",
);

const allowPaths = [
	...new Set(cmsConfig.descriptors.map((d) => d.base)),
];

export const cmsHost = createCmsHost({
	root: contentRoot,
	allowPaths,
	writer: nodeFsWriter(),
	collections: cmsConfig.descriptors,
	schemas: { ...cmsConfig.schemas },
});

export { contentRoot };
