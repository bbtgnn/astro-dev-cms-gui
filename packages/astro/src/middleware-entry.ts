/**
 * Package-owned Astro middleware entrypoint.
 * Registered via `addMiddleware` when `createCmsIntegration({ hostModule })` is set.
 *
 * Host construction stays in the consumer project (`createHost` from
 * `virtual:@cms/host`); this file only wires the protocol transport.
 */

// Virtuals are provided by Vite plugins from createCmsIntegration.
import { createHost } from "virtual:@cms/host";
import { allowInProd, mount } from "virtual:@cms/integration-options";
import { createCmsMiddleware } from "@cms/routes";

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
