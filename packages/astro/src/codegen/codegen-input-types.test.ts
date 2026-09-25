import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	stampImageSchema,
	stampRelationSchema,
} from "../content-proxy/stamp-helpers";
import { defineAstroCms } from "../host/config.ts";
import { printCollectionTypesFile } from "./emit-collection-types";
import { printZodInputType } from "./zod-input-type";

describe("printZodInputType", () => {
	test("maps stamped image/ref to CmsImage / CmsReference", () => {
		const schema = z.object({
			title: z.string(),
			cover: stampImageSchema(z.string()).optional(),
			author: stampRelationSchema(z.string(), "authors"),
			seo: z
				.object({
					description: z.string().optional(),
				})
				.optional(),
		});
		const printed = printZodInputType(schema);
		expect(printed.typeSource).toContain("CmsImage");
		expect(printed.typeSource).toContain('CmsReference<"authors">');
		expect(printed.typeSource).toContain('"title"');
		expect(printed.fields?.cover?.fieldKind).toEqual({ kind: "image" });
		expect(printed.fields?.author?.fieldKind).toEqual({
			kind: "reference",
			collection: "authors",
		});
	});
});

describe("printCollectionTypesFile", () => {
	test("emits module augmentation with brands", () => {
		const authors = z.object({ name: z.string() });
		const posts = z.object({
			title: z.string(),
			cover: stampImageSchema(z.string()).optional(),
			author: stampRelationSchema(z.string(), "authors"),
		});
		const src = printCollectionTypesFile({ authors, posts });
		expect(src).toContain("interface CmsCollections");
		expect(src).toContain("interface CmsFieldKinds");
		expect(src).toContain("CmsImage");
		expect(src).toContain('CmsReference<"authors">');
		expect(src).toContain('"image"');
	});
});

describe("defineAstroCms options overlay", () => {
	test("applies form + previewUrl without schemas", () => {
		const cms = defineAstroCms({
			posts: {
				previewUrl: (id) => `/posts/${id}`,
				form: (f) => [
					f.field("title").label("Title"),
					f.field("cover").label("Cover").kind("image"),
				],
			},
		});
		expect(cms.getPreviewUrl("posts", "x")).toBe("/posts/x");
		expect(cms.forms.posts).toHaveLength(2);
		expect(cms.forms.posts?.[0]).toMatchObject({
			type: "field",
			key: "title",
			chrome: { label: "Title" },
		});
		expect(cms.forms.posts?.[1]).toMatchObject({
			type: "field",
			key: "cover",
			chrome: { label: "Cover", kind: "image" },
		});
	});
});
