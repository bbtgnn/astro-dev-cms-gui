/**
 * Svelte-free schema partition for content.config generation (ADR-0019).
 *
 * Convention: `src/cms.schema.ts`. Loaded by `cms generate` / `cms()` —
 * never import Svelte editors here. Keep persisted shape in sync with
 * `src/cms.config.ts` by discipline (no codegen in v1).
 */
import { s } from "@cms/core/semantic";

export const collections = {
	authors: s.collection({
		loader: s.glob({
			base: "./src/content/authors",
			pattern: "**/*.json",
		}),
		schema: s.field({
			id: "name",
			label: "Name",
			schema: s.string().min(1),
		}),
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
			}),
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
};
