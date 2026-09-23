/**
 * Non-Astro defineCms config — schema + location + form tree.
 * Shared by the authoring shell (client) and createCmsHost (server).
 * No @cms/astro.
 */
import { defineCms } from "@cms/core/define-cms";
import { z } from "zod";

export const cmsConfig = defineCms((cms) => ({
	authors: cms.collection({
		schema: z.object({
			name: z.string().min(1),
		}),
		location: { base: "authors" },
		form: (f) => [
			f.field("name").label("Author name").editor("AuthorNameEditor"),
		],
	}),
	posts: cms.collection({
		schema: z.object({
			title: z.string().min(1),
			draft: z.boolean().default(false),
			body: z.string(),
			cover: cms.image().optional(),
			author: cms.reference("authors"),
			seo: z
				.object({
					description: z.string().optional(),
				})
				.optional(),
		}),
		location: { base: "posts" },
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
						f.field("seo").label("SEO").fields((sf) => [
							sf("description").label("Meta description"),
						]),
					],
				},
				{
					id: "media",
					label: "Media",
					content: [
						f.columns([
							[f.field("cover").label("Cover image")],
							[f.field("author").label("Author")],
						]),
					],
				},
			]),
		],
	}),
}));
