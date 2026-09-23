/**
 * Mount /_cms via hooks — SvelteKit treats `_`-prefixed dirs as private
 * (they do not create routes), so a filesystem `_cms/+server.ts` cannot
 * serve this URL. Same transport contract as Astro middleware.
 */
import { dev } from "$app/environment";
import type { Handle } from "@sveltejs/kit";
import { createCmsDispatcher } from "$lib/cms-dispatcher";
import { cmsHost } from "$lib/cms-host.server";

const mount = "/_cms";
const dispatch = createCmsDispatcher({
	protocol: cmsHost.protocol,
	readAsset: (rel) => cmsHost.readAsset(rel),
	isDev: dev,
	mount,
});

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	if (pathname === mount || pathname.startsWith(`${mount}/`)) {
		const rest = pathname.slice(mount.length).replace(/^\//, "");
		const segments = rest.length > 0 ? rest.split("/") : [];
		return dispatch(event.request, segments);
	}
	return resolve(event);
};
