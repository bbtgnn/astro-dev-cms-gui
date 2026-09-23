/**
 * Schema-first form projection: stamped Zod Input → CollectionFormModel.
 * Client JSON Schema is Ajv-oriented; authoritative parse stays on the Zod schema.
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	applySchemaFormOverlay,
	projectSchemaFormModel,
	projectSchemaFormModels,
} from "../src/semantic/schema-form-projection";

/** Mirror `@cms/astro` content-field stamp without importing the host package. */
const CONTENT_FIELD_STAMP = Symbol.for("@cms/astro.contentFieldStamp");

function stampImage<T extends z.ZodType>(schema: T): T {
	const withMeta = schema.meta({ cms: { kind: "image" as const } }) as T;
	(withMeta as { [key: symbol]: unknown })[CONTENT_FIELD_STAMP] = {
		kind: "image",
	};
	return withMeta;
}

function stampReference<T extends z.ZodType>(schema: T, collection: string): T {
	const withMeta = schema.meta({
		cms: { kind: "reference" as const, collection },
	}) as T;
	(withMeta as { [key: symbol]: unknown })[CONTENT_FIELD_STAMP] = {
		kind: "reference",
		collection,
	};
	return withMeta;
}

function postsLikeSchema() {
	return z.object({
		title: z.string().min(1),
		draft: z.boolean(),
		count: z.number(),
		tags: z.array(z.string()),
		seo: z.object({
			description: z.string(),
		}),
		cover: stampImage(
			z.object({
				src: z.string(),
				width: z.number(),
				height: z.number(),
				format: z.string(),
			}),
		).optional(),
		author: stampReference(z.string(), "authors"),
	});
}

describe("projectSchemaFormModel", () => {
	test("projects stock kinds for string/number/boolean/object/array", () => {
		const model = projectSchemaFormModel(postsLikeSchema(), {
			collectionId: "posts",
		});

		expect(model.collectionId).toBe("posts");
		expect(model.fields.title?.semanticKind).toBe("string");
		expect(model.fields.draft?.semanticKind).toBe("boolean");
		expect(model.fields.count?.semanticKind).toBe("number");
		expect(model.fields.tags?.semanticKind).toBe("array");
		expect(model.fields.seo?.semanticKind).toBe("object");
		expect(model.fields["seo.description"]?.semanticKind).toBe("string");
		expect(model.layout.kind).toBe("stack");
	});

	test("maps stamped image().optional() + reference to form kinds and string Input", () => {
		const model = projectSchemaFormModel(postsLikeSchema(), {
			collectionId: "posts",
		});

		expect(model.fields.cover?.semanticKind).toBe("image");
		expect(model.fields.cover?.optional).toBe(true);
		expect(model.fields.author?.semanticKind).toBe("reference");
		expect(model.fields.author?.referenceCollection).toBe("authors");
		expect(model.fields.author?.optional).toBe(false);

		const props = model.jsonSchema.properties as Record<string, unknown>;
		expect(props.cover).toEqual({ type: "string" });
		expect(props.author).toEqual({ type: "string" });
		expect(props.title).toMatchObject({ type: "string" });
		// Astro image Output object must not leak into the form model.
		expect((props.cover as { properties?: unknown }).properties).toBeUndefined();
		// cms stamp meta is not part of the Ajv client schema.
		expect((props.author as { cms?: unknown }).cms).toBeUndefined();
	});
});

describe("applySchemaFormOverlay", () => {
	test("merges nested path chrome without re-authoring schema", () => {
		const base = projectSchemaFormModel(postsLikeSchema(), {
			collectionId: "posts",
		});
		const model = applySchemaFormOverlay(base, {
			title: { label: "Title" },
			author: { editor: "AuthorPicker" },
			seo: {
				label: "SEO",
				fields: {
					description: { label: "Meta description" },
				},
			},
		});

		expect(model.fields.title?.label).toBe("Title");
		expect(model.fields.author?.component).toBe("AuthorPicker");
		expect(model.fields.seo?.label).toBe("SEO");
		expect(model.fields["seo.description"]?.label).toBe("Meta description");
		// Schema shape unchanged
		expect(model.fields.cover?.semanticKind).toBe("image");
		expect(
			(model.jsonSchema.properties as Record<string, unknown>).author,
		).toEqual({ type: "string" });
	});
});

describe("projectSchemaFormModels", () => {
	test("projects each collection and applies per-collection overlay", () => {
		const models = projectSchemaFormModels(
			{ posts: postsLikeSchema() },
			{
				overlays: {
					posts: {
						title: { label: "Post title" },
					},
				},
			},
		);
		expect(models.posts?.fields.title?.label).toBe("Post title");
		expect(models.posts?.fields.author?.referenceCollection).toBe("authors");
	});
});
