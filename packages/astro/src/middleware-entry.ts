/**
 * Package-owned Astro middleware entrypoint.
 * Registered via `addMiddleware` when the package default CmsHost (or a
 * harness host override) is wired.
 *
 * Host construction: `createHost` from `virtual:@cms/host`.
 */

// Virtuals are provided by Vite plugins from createCmsIntegration.
import { createHost } from "virtual:@cms/host";
import { allowInProd, mount } from "virtual:@cms/integration-options";
import { createCmsMiddleware } from "./http";

const host = createHost();
const handler = createCmsMiddleware({
	protocol: host.protocol,
	readAsset: host.readAsset,
	isDev: import.meta.env.DEV,
	allowInProd,
	mount,
});

export const onRequest = (
	context: { request: Request; url: URL },
	next: () => Promise<Response> | Response,
) => handler(context, next);
