import svelte from "@astrojs/svelte";
import { cms } from "@cms/astro";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [
		svelte(),
		cms({
			editorConfig: "./src/cms/editor-config.ts",
			hostModule: "./src/cms/host.ts",
		}),
	],
});
