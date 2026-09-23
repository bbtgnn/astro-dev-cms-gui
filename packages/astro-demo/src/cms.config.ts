/**
 * Optional overlay editor configuration (schema-first).
 *
 * Presentation only — schemas live in `content.config`.
 * Run `cms sync` (or `astro dev` via cms()) for Input types / ui path safety.
 * Image/ref become CmsImage / CmsReference in generated cms.types.d.ts.
 *
 * Convention path `src/cms.config.ts` → `virtual:@cms/config`.
 * Prefer `export default defineCms(...)` only; Vite soft-binds named faces.
 * Live Svelte editors live in `src/cms.components.ts`.
 */
import { defineCms } from "@cms/astro/config";

export default defineCms({
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
			cover: { label: "Cover image", kind: "image" },
			author: { label: "Author", kind: "reference" },
			seo: {
				label: "SEO",
				fields: {
					description: { label: "Meta description" },
				},
			},
		},
	},
});
