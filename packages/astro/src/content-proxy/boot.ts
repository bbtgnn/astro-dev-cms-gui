/**
 * Boot adapter: Vite alias for stamped loaders + live `astro:content` proxy.
 * Preserves Astro validators; stamps relation / image meta for the host.
 *
 * Host-only. Do not expose `content.config` (or this proxy) to the browser
 * authoring shell — stamps stay on the Node/Vite host graph.
 */
import { proxyAssets } from "./assets";

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

export function astroContentBootProxy() {
	let realId: string | undefined;

	return {
		name: "@cms/astro:content-proxy",
		enforce: "pre" as const,
		async resolveId(
			this: PluginContext,
			id: string,
			importer: string | undefined,
			options: ResolveIdOpts,
		) {
			if (id === PROXY_ID) return PROXY_ID;
			if (id !== "astro:content") return;
			if (options.custom?.[SKIP]) return;

			const resolved = await this.resolve(id, importer, {
				skipSelf: true,
				custom: { [SKIP]: true },
			});
			if (!resolved) return;
			realId = resolved.id;
			return PROXY_ID;
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
