import path from "node:path";
import { fileURLToPath } from "node:url";
import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";

const root = path.resolve(
	fileURLToPath(new URL(".", import.meta.url)),
	"../..",
);

/** PROTOTYPE — alias workspace packages to source for Vite dogfood. */
function pkg(name, entry = "src/index.ts") {
	return path.join(root, "packages", name, entry);
}

// https://astro.build/config
export default defineConfig({
	integrations: [svelte()],
	vite: {
		resolve: {
			alias: {
				"@cms/fields": pkg("fields"),
				"@cms/components": pkg("components"),
				"@cms/components/shadcn": pkg("components", "src/shadcn/index.ts"),
				"@cms/form": pkg("form"),
				"@cms/crud/fetch-client": pkg("crud", "src/fetch-client.ts"),
				"@cms/crud": pkg("crud"),
				"@cms/routes": pkg("routes"),
			},
		},
		server: {
			fs: {
				allow: [root],
			},
		},
	},
});
