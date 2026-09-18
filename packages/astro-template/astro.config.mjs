import svelte from "@astrojs/svelte";
import { cms } from "@cms/astro";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [svelte(), cms()],
	vite: {
		// Monorepo only: workspace @cms/* packages export TypeScript with
		// extensionless relatives. Node ESM cannot load those; Vite must.
		// Published @cms/* builds would not need this — keep it out of @cms/astro.
		ssr: {
			noExternal: [/^@cms\//],
		},
		optimizeDeps: {
			// Include transitive workspace packages (@cms/authoring via @cms/astro).
			exclude: ["@cms/astro", "@cms/authoring", "@cms/core"],
		},
	},
});
