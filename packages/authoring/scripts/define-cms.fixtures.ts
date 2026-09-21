/**
 * Compile-time fixtures for `defineCms` host facade (via authoring builders;
 * `@cms/astro/config` re-exports the same surface).
 */

import type { Component } from "svelte";
import {
	type FieldEditorProps,
	createCmsBuilders,
	type CmsConfigInput,
} from "../src/config";

type Collections = "posts" | "authors";

const AuthorPicker = ((_: unknown, __: unknown) => ({})) as Component<
	FieldEditorProps<string, "reference">
>;

const catalog = { AuthorPicker } as const;
type Components = typeof catalog;

function defineCmsLocal<
	C extends string,
	Comp extends typeof catalog = Components,
>(
	factory: (
		s: ReturnType<typeof createCmsBuilders<C, Comp>>,
	) => CmsConfigInput,
): CmsConfigInput {
	return factory(createCmsBuilders<C, Comp>());
}

const config = defineCmsLocal<Collections>((s) => ({
	collections: {
		posts: s.collection({
			loader: s.glob({
				base: "./src/content/posts",
				pattern: "**/*.json",
			}),
			schema: s.tabs([
				s.tab({
					id: "content",
					label: "Content",
					content: [
						s.field({
							id: "title",
							label: "Title",
							schema: s.string().min(1),
						}),
						s.field({
							id: "author",
							schema: s.reference("authors"),
						}).editor("AuthorPicker"),
						s.object({
							id: "seo",
							content: [
								s.field({ id: "title", schema: s.string() }),
								s.field({ id: "description", schema: s.string() }),
							],
						}),
					],
				}),
			]),
		}),
	},
}));

void config;

defineCmsLocal<Collections>((s) => ({
	collections: {
		posts: s.collection({
			loader: s.glob({ base: "./c", pattern: "**/*.json" }),
			schema: s.field({
				id: "author",
				// @ts-expect-error "pages" is not in Collections
				schema: s.reference("pages"),
			}),
		}),
	},
}));

export {};
