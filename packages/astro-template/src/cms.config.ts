/**
 * Browser-safe CMS unified tree — human source (ADR-0019).
 *
 * Convention path `src/cms.config.ts`. Loaded through `virtual:@cms/config`
 * (host Vite graph). Must not import Astro server modules, Node builtins,
 * filesystem utilities, or secrets.
 *
 * Persisted shape is mirrored (Svelte-free) in `src/cms.schema.ts` for
 * generation. Keep both trees in sync by discipline for v1.
 */
import { defineCms } from "@cms/astro/config";
import { editorCollectionsFromFormModels } from "@cms/authoring";
import {
	compileSemanticIr,
	projectFormModels,
} from "@cms/core/semantic";
import AuthorNameEditor from "./cms/fields/AuthorNameEditor.svelte";
import BodyEditor from "./cms/fields/BodyEditor.svelte";

type Collections = "posts" | "authors";

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

const cms = defineCms<Collections>((s) => ({
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
				component: AuthorNameEditor,
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
					component: BodyEditor,
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
	},
	getPreviewUrl,
}));

const ir = compileSemanticIr({ collections: cms.collections });
const formModels = projectFormModels(ir);

/** Collection name → lowered IR form model for the authoring shell. */
export const collections = editorCollectionsFromFormModels(formModels);

const editorConfig = { collections, getPreviewUrl };
export default editorConfig;
