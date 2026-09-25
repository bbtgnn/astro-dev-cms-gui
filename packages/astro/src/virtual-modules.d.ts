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

	export const forms: Readonly<Record<string, FormTree>>;
	export const types: Readonly<Record<string, "collection" | "singleton">>;
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

	const components: Readonly<Record<string, AnySvelteComponent>>;
	export default components;
}

declare module "virtual:@cms/host" {
	import type { CmsHost } from "@cms/core";

	export function createHost(): CmsHost;
}

declare module "virtual:@cms/integration-options" {
	export const mount: string;
	export const allowInProd: boolean | undefined;
	export const contentRoot: string;
}

declare module "*.svelte" {
	import type { Component } from "svelte";

	const component: Component;
	export default component;
}
