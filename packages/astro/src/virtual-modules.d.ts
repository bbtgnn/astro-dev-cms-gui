/**
 * Ambient types for Vite virtual modules registered by createCmsIntegration.
 * Real modules are generated at host Vite config time.
 * Package-internal — consumers do not import these IDs.
 */

interface ImportMetaEnv {
	readonly DEV: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare module "virtual:@cms/content-config" {
	/** User Astro content collections (host/SSR only). */
	export const collections: Readonly<
		Record<
			string,
			{
				loader?: unknown;
				schema?: unknown;
			}
		>
	>;
}

declare module "virtual:@cms/config" {
	import type { FormTree } from "@cms/core/form-tree";

	/** Per-collection form trees (normalized from options.*.form). */
	export const forms: Readonly<Record<string, FormTree>>;
	/** Per-collection editor mode (normalized from options.*.type). */
	export const types: Readonly<Record<string, "collection" | "singleton">>;
	/** Host-compiled entry → site preview URL; null when unsupported. */
	export function getPreviewUrl(collection: string, id: string): string | null;
	const config: {
		forms?: Readonly<Record<string, FormTree>>;
		types?: Readonly<Record<string, "collection" | "singleton">>;
		getPreviewUrl?: (collection: string, id: string) => string | null;
	};
	export default config;
}

declare module "virtual:@cms/components" {
	import type { AnySvelteComponent } from "@cms/authoring/config";

	/** Live Svelte catalog keyed by overlay binding strings. */
	const components: Readonly<Record<string, AnySvelteComponent>>;
	export default components;
}

declare module "virtual:@cms/host" {
	import type { CmsHost } from "@cms/core";

	/** Host factory (package default FS adapter or project override). */
	export function createHost(): CmsHost;
}

declare module "virtual:@cms/integration-options" {
	/** Mount prefix without trailing slash (default `/cms/api`). */
	export const mount: string;
	export const allowInProd: boolean | undefined;
	/** Absolute write-back root (default `src/content`). */
	export const contentRoot: string;
}

declare module "*.svelte" {
	import type { Component } from "svelte";

	const component: Component;
	export default component;
}
