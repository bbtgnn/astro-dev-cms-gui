/**
 * Optional overlay editor configuration (schema-first).
 *
 * Dual registration: same schema record as content.config (from
 * @cms/astro-demo-simple/schemas). Options are presentation-only — labels,
 * nested field chrome, catalog editor keys, preview. No IR `s.field` algebra.
 *
 * Convention path `src/cms.config.ts` → `virtual:@cms/config`.
 * Prefer `export default defineCms(...)` only; Vite soft-binds named faces.
 * Live Svelte editors live in `src/cms.components.ts`.
 */
import { defineCms } from "@cms/astro/config";
import {
	authorsSchema,
	postsSchemaInput,
} from "@cms/astro-demo-simple/schemas";

const schemas = {
	authors: authorsSchema,
	/** Input-shaped dual registration (shared builder; string stub for image). */
	posts: postsSchemaInput,
};

export default defineCms(schemas, {
	authors: {
		ui: {
			name: {
				label: "Author name",
				editor: "AuthorNameEditor",
			},
		},
	},
	posts: {
		previewUrl: (id) => {
			const trimmed = id.trim();
			if (!trimmed) return null;
			return `/posts/${encodeURIComponent(trimmed)}`;
		},
		ui: {
			title: { label: "Post title" },
			draft: { label: "Draft" },
			body: { label: "Body" },
			cover: { label: "Cover image" },
			author: { label: "Author" },
			seo: {
				label: "SEO",
				fields: {
					description: { label: "Meta description" },
				},
			},
		},
	},
});
