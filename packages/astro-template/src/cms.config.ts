/**
 * Browser-safe editor configuration — Zod + FieldUi + direct Svelte components.
 *
 * Convention path `src/cms.config.ts` (ADR-0016). Loaded through
 * `virtual:@cms/config` (host Vite graph). Must not import Astro server modules,
 * Node builtins, filesystem utilities, or secrets.
 * Server collection registry (`content.config`) is a separate edge (ADR-0004).
 */
import {
	boolean,
	config,
	field,
	i18n,
	image,
	markdown,
	object,
	reference,
	text,
} from "@cms/fields";
import type { z } from "zod";
import type { AuthorsPersistedInput } from "./cms/authors-persisted";
import AuthorNameEditor from "./cms/fields/AuthorNameEditor.svelte";
import { postsBlocksField } from "./cms/post-blocks";

/** Compile-time equality without a broad cast (sample authors collection). */
type AssertEqual<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

/**
 * Authors editor projection — same persisted input as the server registry,
 * with a direct Svelte field editor on `name`.
 */
export const authorsEditorSchema = object(
	{
		name: field(text({ label: "Author name" }), {
			ui: AuthorNameEditor,
			title: "Author name",
		}),
	},
	{ label: "Authors" },
).meta(config({ label: "Authors", base: "authors" }));

export type AuthorsEditorInput = z.input<typeof authorsEditorSchema>;

const _authorsInputParity: AssertEqual<
	AuthorsEditorInput,
	AuthorsPersistedInput
> = true;
void _authorsInputParity;

/**
 * Posts editor projection — portable builders only (no Astro helpers).
 * Mechanism proof focuses on authors; posts stay editable through the same path.
 */
export const postsEditorSchema = object(
	{
		title: text({ label: "Title" }),
		draft: boolean({ label: "Draft", default: false }),
		body: markdown({ label: "Body" }),
		summary: i18n(text({ label: "Summary" }), {
			label: "Summary",
			locales: ["en", "it"],
			defaultLocale: "en",
			fallbacks: { it: "en" },
		}),
		blocks: postsBlocksField,
		cover: image({ label: "Cover" }).optional(),
		author: reference("authors", {
			label: "Author",
		}),
	},
	{ label: "Posts" },
).meta(config({ label: "Posts", base: "posts" }));

/** Collection name → live Zod editor schema (components stay module values). */
export const collections = {
	authors: authorsEditorSchema,
	posts: postsEditorSchema,
} as const;

export type EditorCollections = typeof collections;

/**
 * Derive the real Astro site route for a content entry (ADR-0013).
 * Host-compiled only — identity in, site path out; no form/draft payload.
 * Unsupported collections return null so the authoring UI offers no action.
 */
export function getPreviewUrl(collection: string, id: string): string | null {
	const trimmed = id.trim();
	if (!trimmed) return null;
	if (collection === "posts") {
		return `/posts/${encodeURIComponent(trimmed)}`;
	}
	return null;
}

const editorConfig = { collections, getPreviewUrl };
export default editorConfig;
