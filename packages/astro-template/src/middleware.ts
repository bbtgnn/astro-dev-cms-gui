/**
 * PROTOTYPE / SPIKE — Track C: template consumes createCmsMiddleware from @cms/routes.
 * Astro ignores `_`-prefixed pages, so /_cms is mounted here.
 * Vite `virtual:@cms/config` is registered via createCmsIntegration in astro.config.
 */
import { defineMiddleware } from "astro:middleware";
import { createCmsMiddleware } from "@cms/routes";
import { createTemplateCmsProtocol } from "./cms/write-mode";

export const onRequest = defineMiddleware(
	createCmsMiddleware({
		protocol: createTemplateCmsProtocol(),
		isDev: true,
		mount: "/_cms",
	}),
);
