/**
 * Reference host: mounts /_cms via createCmsMiddleware from @cms/routes.
 * Astro ignores `_`-prefixed pages, so /_cms is mounted here.
 * Vite `virtual:@cms/config` is registered via createCmsIntegration in astro.config.
 */
import { defineMiddleware } from "astro:middleware";
import { createCmsMiddleware } from "@cms/routes";
import { createTemplateCmsHost } from "./cms/write-mode";

const host = createTemplateCmsHost();

export const onRequest = defineMiddleware(
	createCmsMiddleware({
		protocol: host.protocol,
		readAsset: host.readAsset,
		isDev: true,
		mount: "/_cms",
	}),
);
