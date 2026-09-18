/**
 * Ambient types for Vite virtual modules registered by createCmsIntegration.
 * Real modules are generated at host Vite config time.
 */

interface ImportMetaEnv {
	readonly DEV: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare module "virtual:@cms/config" {
	import type { z } from "zod";

	export const collections: Record<string, z.ZodType>;
	export function getPreviewUrl(collection: string, id: string): string | null;
	const config: {
		collections: Record<string, z.ZodType>;
		getPreviewUrl?: (collection: string, id: string) => string | null;
	};
	export default config;
}

declare module "virtual:@cms/host" {
	import type { CmsHost } from "@cms/crud";

	/** Project factory required by `hostModule`. */
	export function createHost(): CmsHost;
}

declare module "virtual:@cms/integration-options" {
	/** Mount prefix without trailing slash (default `/_cms`). */
	export const mount: string;
	export const allowInProd: boolean | undefined;
}

declare module "*.svelte" {
	import type { Component } from "svelte";

	const component: Component;
	export default component;
}
