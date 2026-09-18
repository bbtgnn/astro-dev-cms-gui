/// <reference types="astro/client" />

/** Fallback for workspace `.svelte` imports resolved outside this package. */
declare module "*.svelte" {
	import type { Component } from "svelte";

	const component: Component;
	export default component;
}

/**
 * Host-compiled editor configuration (ADR-0003 / ADR-0004).
 * Live Zod schemas + direct Svelte components — not protocol payloads.
 */
declare module "virtual:@cms/config" {
	import type { z } from "zod";

	export const collections: Record<string, z.ZodType>;
	/** Host-compiled entry → site preview URL; null when unsupported. */
	export function getPreviewUrl(collection: string, id: string): string | null;
	const config: {
		collections: Record<string, z.ZodType>;
		getPreviewUrl?: (collection: string, id: string) => string | null;
	};
	export default config;
}
