/**
 * Node-safe CMS unified tree — human source (ADR-0019 residual 4.1).
 *
 * Convention path `src/cms.config.ts`. Loaded as generation partition and as
 * `virtual:@cms/config`. No runtime Svelte imports — only `import type` from
 * the components catalog when typing `defineCms` generics. Live editors live
 * in `src/cms.components.ts` and resolve via `virtual:@cms/components`.
 */
import { defineCms } from "@cms/astro/config";

type Collections = "posts" | "authors";
type Components = typeof import("./cms.components").default;

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

const cms = defineCms<Collections, Components>((s) => ({
	collections: {
		authors: s.collection({
			loader: s.glob({
				base: "./src/content/authors",
				pattern: "**/*.json",
			}),
			schema: s.field({
				id: "name",
				label: "Author name",
				schema: s.string().min(1),
			}).editor("AuthorNameEditor"),
		}),
		posts: s.collection({
			loader: s.glob({
				base: "./src/content/posts",
				pattern: "**/*.json",
			}),
			schema: s.stack([
				s.field({
					id: "title",
					label: "Title",
					schema: s.string().min(1),
				}),
				s.field({
					id: "draft",
					label: "Draft",
					schema: s.boolean().default(false),
				}),
				s.field({
					id: "body",
					label: "Body",
					schema: s.string(),
				}).editor("BodyEditor"),
				s.field({
					id: "cover",
					label: "Cover",
					schema: s.image().optional(),
				}),
				s.field({
					id: "author",
					label: "Author",
					schema: s.reference("authors"),
				}),
			]),
		}),
	},
	getPreviewUrl,
}));

export const collections = cms.collections;
export default cms;
