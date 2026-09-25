/**
 * Optional overlay editor configuration (schema-first).
 *
 * Presentation only — schemas live in `content.config`.
 * Run `cms sync` (or `astro dev` via cms()) for Input types / form field-ref safety.
 * Image/ref become CmsImage / CmsReference in generated cms.types.d.ts.
 *
 * Convention path `src/cms.config.ts` → `virtual:@cms/config`.
 * Prefer `export default defineAstroCms(...)` only; Vite soft-binds named faces.
 * Live Svelte editors live in `src/cms.components.ts`.
 * Portable schema + location + form uses `defineCms` from `@cms/core`.
 */
import { defineAstroCms } from "@cms/astro/config";

export default defineAstroCms({
	authors: {
		form: (f) => [
			f.field("name").label("Author name").editor("AuthorNameEditor"),
		],
	},
	posts: {
		previewUrl: (id) => {
			const trimmed = id.trim();
			if (!trimmed) return null;
			return `/posts/${encodeURIComponent(trimmed)}`;
		},
		form: (f) => [
			f.tabs([
				{
					id: "content",
					label: "Content",
					content: [
						f.field("title").label("Post title"),
						f.field("draft").label("Draft"),
						f.field("body").label("Body"),
						f
							.field("seo")
							.label("SEO")
							.fields((sf) => [sf("description").label("Meta description")]),
					],
				},
				{
					id: "media",
					label: "Media",
					content: [
						f.field("cover").label("Cover image").kind("image"),
						f.field("author").label("Author").kind("reference"),
					],
				},
			]),
		],
	},
});
