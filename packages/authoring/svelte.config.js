/** Minimal config so `@sveltejs/package` can preprocess authoring sources. */
import { vitePreprocess } from "@astrojs/svelte";

/** @type {import('svelte').Config} */
const config = {
	preprocess: vitePreprocess(),
};

export default config;
