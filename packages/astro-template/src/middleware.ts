/**
 * PROTOTYPE / SPIKE — Track C: template consumes createCmsIntegration from @cms/routes.
 * Astro ignores `_`-prefixed pages, so /_cms is mounted here.
 */
import { defineMiddleware } from "astro:middleware";
import { createCmsIntegration } from "@cms/routes";
import { createTemplateCmsProtocol } from "./cms/write-mode";

const cms = createCmsIntegration({
	protocol: createTemplateCmsProtocol(),
	isDev: true,
	mount: "/_cms",
});

export const onRequest = defineMiddleware(cms.middleware);
