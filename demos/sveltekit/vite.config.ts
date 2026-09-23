import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// Monorepo: workspace @cms/* packages export TypeScript with
		// extensionless relatives — Vite must bundle them for Node.
		noExternal: [/^@cms\//],
	},
	optimizeDeps: {
		exclude: ["@cms/authoring", "@cms/core"],
	},
	server: {
		fs: {
			allow: ["../.."],
		},
	},
});
