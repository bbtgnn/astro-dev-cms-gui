/**
 * Optional overlay editor configuration (schema-first).
 *
 * Dual registration: same schema record as content.config (from
 * @cms/astro-demo-simple/schemas). Overlay is presentation-only — labels,
 * nested field chrome, catalog editor keys. No IR `s.field` algebra.
 *
 * Convention path `src/cms.config.ts` → `virtual:@cms/config`.
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

/**
 * Derive the real Astro site route for a content entry (ADR-0013).
 * Host-compiled only — identity in, site path out; no form/draft payload.
 */
export function getPreviewUrl(collection: string, id: string): string | null {
	const trimmed = id.trim();
	if (!trimmed) return null;
	if (collection === "posts") {
		return `/posts/${encodeURIComponent(trimmed)}`;
	}
	return null;
}

const cms = defineCms(schemas, {
	overlays: {
		authors: {
			name: {
				label: "Author name",
				editor: "AuthorNameEditor",
			},
		},
		posts: {
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
	getPreviewUrl,
});

export const collections = cms.collections;
export const overlays = cms.overlays;
export default cms;
