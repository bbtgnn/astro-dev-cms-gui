/**
 * Codegen: Zod Input types + CmsImage / CmsReference brands from stamps.
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { printCollectionTypesFile } from "../src/codegen/emit-collection-types";
import { printZodInputType } from "../src/codegen/zod-input-type";
import {
	stampImageSchema,
	stampRelationSchema,
} from "../src/content-proxy/stamp-helpers";
import { defineCms } from "../src/config.ts";
import { collectionsFromContentConfigExport } from "../src/testing.ts";

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

describe("defineCms with Astro-shaped collections", () => {
	test("materializes fixture collections and applies ui overlay", async () => {
		const mod = await import("./fixtures/authors-posts-content.config.ts");
		const loaded = collectionsFromContentConfigExport(mod);
		const cms = defineCms(loaded, {
			posts: {
				previewUrl: (id) => `/posts/${id}`,
				ui: {
					title: { label: "Title" },
					cover: { label: "Cover", kind: "image" },
				},
			},
		});
		expect(cms.getPreviewUrl("posts", "x")).toBe("/posts/x");
		expect(cms.overlays.posts?.title?.label).toBe("Title");
		expect(typeof cms.collections.posts.parse).toBe("function");
	});
});
