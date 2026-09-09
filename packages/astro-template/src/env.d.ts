/// <reference types="astro/client" />

/** Fallback for workspace `.svelte` imports resolved outside this package. */
declare module "*.svelte" {
	import type { Component } from "svelte";
	const component: Component;
	export default component;
}
