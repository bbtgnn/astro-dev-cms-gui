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
	import type { UiSchemaNode } from "@cms/core/fields";
	import type { z } from "zod";

	/** Zod+FieldUi (legacy) or lowered IR form model (JSON Schema + uiSchema). */
	export type EditorCollectionInput =
		| z.ZodType
		| {
				readonly schema: Record<string, unknown>;
				readonly uiSchema?: UiSchemaNode;
		  };

	export const collections: Record<string, EditorCollectionInput>;
	/** Host-compiled entry → site preview URL; null when unsupported. */
	export function getPreviewUrl(collection: string, id: string): string | null;
	const config: {
		collections: Record<string, EditorCollectionInput>;
		getPreviewUrl?: (collection: string, id: string) => string | null;
	};
	export default config;
}

declare module "virtual:@cms/host" {
	import type { CmsHost } from "@cms/core";

	/** Host factory (project override or package default). */
	export function createHost(): CmsHost;
}

declare module "virtual:@cms/content-config" {
	/** Live Astro `content.config` collections export for the legacy default host. */
	export const collections: Record<string, unknown>;
}

declare module "virtual:@cms/schema-partition" {
	import type { SemanticConfigInput } from "@cms/core/semantic";

	/** Svelte-free partition collections for the CMS-first default host. */
	export const collections: SemanticConfigInput["collections"];
}

declare module "virtual:@cms/integration-options" {
	/** Mount prefix without trailing slash (default `/_cms`). */
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
