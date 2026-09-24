/**
 * Boot adapter: Vite alias for stamped loaders + live `astro:content` proxy.
 * Preserves Astro validators; stamps relation / image meta for the host.
 *
 * Host-only. Do not expose `content.config` (or this proxy) to the browser
 * authoring shell — stamps stay on the Node/Vite host graph.
 */
import { proxyAssets } from "./assets";

/** Astro 7 content virtual module (see `astro/dist/content/consts.js`). */
const ASTRO_CONTENT_ID = "astro:content";
/** Astro’s resolved id after its content virtual-mod plugin remaps the bare import. */
const ASTRO_CONTENT_RESOLVED_ID = `\0${ASTRO_CONTENT_ID}`;
const PROXY_ID = "\0@cms/astro/astro-content-proxy";
const SKIP = "cms-astro-content-proxy";

type ResolveIdOpts = {
	custom?: Record<string, unknown>;
};

type PluginContext = {
	resolve: (
		source: string,
		importer: string | undefined,
		opts?: { skipSelf?: boolean; custom?: Record<string, unknown> },
	) => Promise<{ id: string } | null>;
};

function isAstroContentResolveId(id: string): boolean {
	return id === ASTRO_CONTENT_ID || id === ASTRO_CONTENT_RESOLVED_ID;
}

export function astroContentBootProxy() {
	let realId: string | undefined;

	return {
		name: "@cms/astro:content-proxy",
		enforce: "pre" as const,
		resolveId: {
			// Astro’s `astro-content-virtual-mod-plugin` is registered earlier in
			// create-vite and also uses enforce:"pre". Its resolveId is an object
			// hook *without* `order`, so Vite sorts it into the normal bucket.
			// Hook-level `order: "pre"` makes us run first and win the bare
			// `astro:content` import. We also remap `\0astro:content` in case a
			// later importer already carries Astro’s resolved virtual id.
			order: "pre" as const,
			async handler(
				this: PluginContext,
				id: string,
				importer: string | undefined,
				options: ResolveIdOpts,
			) {
				if (id === PROXY_ID) return PROXY_ID;
				if (!isAstroContentResolveId(id)) return;
				if (options.custom?.[SKIP]) return;

				// Already-resolved Astro id: remap user importers. When the proxy
				// itself imports the real module, return the id unchanged so Vite
				// treats it as resolved and Astro’s load can serve it (a bare
				// `undefined` falls through to failed filesystem resolve).
				if (id === ASTRO_CONTENT_RESOLVED_ID) {
					if (importer === PROXY_ID) return ASTRO_CONTENT_RESOLVED_ID;
					realId = ASTRO_CONTENT_RESOLVED_ID;
					return PROXY_ID;
				}

				const resolved = await this.resolve(ASTRO_CONTENT_ID, importer, {
					skipSelf: true,
					custom: { [SKIP]: true },
				});
				if (!resolved) return;
				realId = resolved.id;
				return PROXY_ID;
			},
		},
		load(id: string) {
			if (id !== PROXY_ID || !realId) return;
			const real = JSON.stringify(realId);
			const helpersHref = JSON.stringify(proxyAssets().stampHelpersHref);
			return `
import * as __real from ${real};
import { stampRelationSchema, stampImageSchema } from ${helpersHref};

export const z = __real.z;
export const render = __real.render;
export const getCollection = __real.getCollection;
export const getEntry = __real.getEntry;
export const getEntries = __real.getEntries;
export const getEntryBySlug = __real.getEntryBySlug;
export const getDataEntryById = __real.getDataEntryById;
export const getLiveCollection = __real.getLiveCollection;
export const getLiveEntry = __real.getLiveEntry;
export const defineLiveCollection = __real.defineLiveCollection;

export function reference(collection) {
	return stampRelationSchema(__real.reference(collection), collection);
}

export function defineCollection(config) {
	if (config && typeof config.schema === "function") {
		const userSchema = config.schema;
		return __real.defineCollection({
			...config,
			schema: (ctx) => {
				const image = () => stampImageSchema(ctx.image());
				return userSchema({ ...ctx, image });
			},
		});
	}
	return __real.defineCollection(config);
}
`;
		},
	};
}

/** Boot-time aliases for `astro/loaders` (stamp glob/file inputs). */
export function viteAliasesForBoot(): {
	find: string | RegExp;
	replacement: string;
}[] {
	const { loaders } = proxyAssets();
	return [{ find: /^astro\/loaders$/, replacement: loaders }];
}

/** Boot-time Vite plugins — live `astro:content` proxy for reference/image meta. */
export function vitePluginsForBoot() {
	return [astroContentBootProxy()];
}
