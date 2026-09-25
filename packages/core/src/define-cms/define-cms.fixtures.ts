/**
 * Compile-time fixtures for non-Astro defineCms (ticket 15).
 * Expect: `bunx tsc -p ./scripts/tsconfig.fixtures.json` exits 0.
 * Negatives use @ts-expect-error.
 */

import { z } from "zod";
import {
	type CmsFile,
	type CmsImage,
	type CmsReference,
	defineCms,
} from "./define-cms";

const config = defineCms((cms) => ({
	authors: cms.collection({
		schema: z.object({ name: z.string() }),
		location: { base: "src/content/authors" },
		form: (f) => [f.field("name").label("Name")],
	}),
	posts: cms.collection({
		schema: z.object({
			title: z.string(),
			cover: cms.image(),
			attachment: cms.file(),
			author: cms.reference("authors"),
		}),
		location: { base: "src/content/posts" },
		form: (f) => [
			f.field("title"),
			f.field("cover").kind("image"),
			f.field("author").kind("reference"),
		],
		previewUrl: (id) => `/posts/${id}`,
	}),
}));

void config.descriptors;
void config.forms.posts;
void config.schemas.authors;

// Input brands flow from leaf helpers into form field keys
type PostsInput = z.input<(typeof config.schemas)["posts"]>;
type _CoverIsImage = PostsInput["cover"] extends CmsImage ? true : false;
type _FileIsFile = PostsInput["attachment"] extends CmsFile ? true : false;
type _AuthorIsRef =
	PostsInput["author"] extends CmsReference<"authors"> ? true : false;
const _brands: [_CoverIsImage, _FileIsFile, _AuthorIsRef] = [true, true, true];
void _brands;

// Form field keys are keyof schema Input
defineCms((cms) => ({
	posts: cms.collection({
		schema: z.object({ title: z.string() }),
		location: { base: "c" },
		form: (f) => [
			// @ts-expect-error "missing" is not a key of posts Input
			f.field("missing"),
		],
	}),
}));
