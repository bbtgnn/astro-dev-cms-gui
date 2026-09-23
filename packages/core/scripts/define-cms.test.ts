/**
 * Non-Astro defineCms — schema + location + form → host descriptors (ticket 15).
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	CONTENT_FIELD_STAMP,
	type ContentFieldStampMeta,
	projectSchemaFormModel,
} from "../src/semantic/schema-form-projection";
import { defineCms } from "../src/define-cms";

function contentStamp(schema: unknown): ContentFieldStampMeta | undefined {
	if (!schema || typeof schema !== "object") return undefined;
	return (schema as { [CONTENT_FIELD_STAMP]?: ContentFieldStampMeta })[
		CONTENT_FIELD_STAMP
	];
}

describe("defineCms", () => {
	test("builds CollectionDescriptor[] from schema + location", () => {
		const config = defineCms((cms) => ({
			authors: cms.collection({
				schema: z.object({ name: z.string() }),
				location: { base: "src/content/authors" },
			}),
			posts: cms.collection({
				schema: z.object({ title: z.string() }),
				location: {
					base: "src/content/posts",
					pathTemplate: "{base}/{id}.json",
				},
				type: "singleton",
			}),
		}));

		expect(config.descriptors).toHaveLength(2);
		expect(config.descriptors[0]).toMatchObject({
			name: "authors",
			base: "src/content/authors",
			config: { base: "src/content/authors" },
		});
		expect(config.descriptors[1]).toMatchObject({
			name: "posts",
			base: "src/content/posts",
			config: {
				base: "src/content/posts",
				pathTemplate: "{base}/{id}.json",
				kind: "singleton",
			},
		});

		expect(config.schemas.authors).toBe(config.descriptors[0]?.schema);
		expect(config.schemas.posts).toBe(config.descriptors[1]?.schema);
		expect(config.collections.authors.location.base).toBe(
			"src/content/authors",
		);
		expect(config.types.posts).toBe("singleton");
		expect(config.types.authors).toBe("collection");
	});

	test("resolves form trees typed against schema Input", () => {
		const config = defineCms((cms) => ({
			posts: cms.collection({
				schema: z.object({ title: z.string(), body: z.string() }),
				location: { base: "src/content/posts" },
				form: (f) => [
					f.field("title").label("Title"),
					f.group({
						label: "Body",
						content: [f.field("body")],
					}),
				],
				previewUrl: (id) => `/posts/${id}`,
			}),
		}));

		expect(config.forms.posts).toHaveLength(2);
		expect(config.forms.posts?.[0]).toMatchObject({
			type: "field",
			key: "title",
			chrome: { label: "Title" },
		});
		expect(config.forms.posts?.[1]).toMatchObject({
			type: "group",
			label: "Body",
		});
		expect(config.getPreviewUrl("posts", "hello")).toBe("/posts/hello");
		expect(config.getPreviewUrl("missing", "x")).toBeNull();
	});

	test("accepts a pre-built form tree", () => {
		const config = defineCms((cms) => ({
			posts: cms.collection({
				schema: z.object({ title: z.string() }),
				location: { base: "c" },
				form: [{ type: "field", key: "title" }],
			}),
		}));
		expect(config.forms.posts?.[0]).toMatchObject({
			type: "field",
			key: "title",
		});
	});

	test("leaf helpers stamp image / file / reference for projection", () => {
		const config = defineCms((cms) => ({
			authors: cms.collection({
				schema: z.object({ name: z.string() }),
				location: { base: "src/content/authors" },
			}),
			posts: cms.collection({
				schema: z.object({
					title: z.string(),
					cover: cms.image(),
					attachment: cms.file(),
					author: cms.reference("authors"),
				}),
				location: { base: "src/content/posts" },
			}),
		}));

		const shape = (
			config.schemas.posts as z.ZodObject<{
				cover: z.ZodType;
				attachment: z.ZodType;
				author: z.ZodType;
			}>
		).shape;

		expect(contentStamp(shape.cover)).toEqual({ kind: "image" });
		expect(contentStamp(shape.attachment)).toEqual({ kind: "file" });
		expect(contentStamp(shape.author)).toEqual({
			kind: "reference",
			collection: "authors",
		});

		const model = projectSchemaFormModel(config.schemas.posts, {
			collectionId: "posts",
			form: config.forms.posts,
		});
		expect(model.fields.cover?.semanticKind).toBe("image");
		expect(model.fields.author?.semanticKind).toBe("reference");
		expect(model.fields.author?.referenceCollection).toBe("authors");
		// file stamp is present for kinds; projection may keep string until later
		expect(model.fields.attachment?.semanticKind).toBe("string");
	});
});
