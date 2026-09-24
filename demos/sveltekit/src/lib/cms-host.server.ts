/**
 * Server-only CmsHost — nodeFsWriter under ./data via hostFromDefineCms.
 * `.server.ts` keeps FS / Node out of the client bundle.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hostFromDefineCms } from "@cms/core";
import { cmsConfig } from "./cms";

const contentRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../data",
);

export const cmsHost = hostFromDefineCms(cmsConfig, { root: contentRoot });

export { contentRoot };
