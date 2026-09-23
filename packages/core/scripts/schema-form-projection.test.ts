/**
 * Schema-first form projection: stamped Zod Input → CollectionFormModel.
 * Client JSON Schema is Ajv-oriented; authoritative parse stays on the Zod schema.
 * Optional form tree (ticket 13) lowers layout + field-ref chrome onto the model.
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { createFormTreeHelpers } from "../src/form-tree";
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
		expect(
			(props.cover as { properties?: unknown }).properties,
		).toBeUndefined();
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

type PostsData = {
	title: string;
	draft: boolean;
	count: number;
	tags: string[];
	seo: { description: string };
	cover?: unknown;
	author: string;
};

describe("projectSchemaFormModel with form tree", () => {
	test("lowers tabs + nested seo scope and merges field-ref chrome", () => {
		const { field, tabs } = createFormTreeHelpers<PostsData>();
		const form = [
			tabs([
				{
					id: "content",
					label: "Content",
					content: [
						field("title").label("Post title"),
						field("draft").label("Draft"),
						field("seo")
							.label("SEO")
							.fields((f) => [
								f("description").label("Meta description"),
							]),
					],
				},
				{
					id: "media",
					label: "Media",
					content: [
						field("cover").label("Cover image").kind("image"),
						field("author").label("Author").editor("AuthorPicker"),
					],
				},
			]),
		];

		const model = projectSchemaFormModel(postsLikeSchema(), {
			collectionId: "posts",
			form,
		});

		expect(model.layout.kind).toBe("stack");
		if (model.layout.kind !== "stack") throw new Error("expected stack");
		expect(model.layout.content[0]?.kind).toBe("tabs");
		const tabsNode = model.layout.content[0];
		if (tabsNode?.kind !== "tabs") throw new Error("expected tabs");
		expect(tabsNode.content.map((t) => t.id)).toEqual(["content", "media"]);
		expect(tabsNode.content[0]?.label).toBe("Content");

		const contentTab = tabsNode.content[0];
		expect(contentTab?.content.some((n) => n.kind === "field" && n.path === "title")).toBe(
			true,
		);
		const seoNode = contentTab?.content.find((n) => n.kind === "object");
		expect(seoNode).toMatchObject({
			kind: "object",
			path: "seo",
		});
		if (seoNode?.kind !== "object") throw new Error("expected seo object");
		expect(seoNode.content).toEqual([
			{ kind: "field", path: "seo.description" },
		]);

		expect(model.fields.title?.label).toBe("Post title");
		expect(model.fields.draft?.label).toBe("Draft");
		expect(model.fields.seo?.label).toBe("SEO");
		expect(model.fields["seo.description"]?.label).toBe("Meta description");
		expect(model.fields.cover?.label).toBe("Cover image");
		expect(model.fields.cover?.semanticKind).toBe("image");
		expect(model.fields.author?.label).toBe("Author");
		expect(model.fields.author?.component).toBe("AuthorPicker");

		// Unplaced top-level keys (count, tags) append to the default stack.
		const unplaced = model.layout.content.slice(1);
		expect(unplaced.map((n) => ("path" in n ? n.path : n.kind))).toEqual([
			"count",
			"tags",
		]);
	});

	test("lowers columns and group into form-model layout kinds", () => {
		const { field, columns, group } = createFormTreeHelpers<PostsData>();
		const form = [
			columns([
				[field("title")],
				[
					group({
						label: "Flags",
						content: [field("draft")],
					}),
				],
			]),
		];

		const model = projectSchemaFormModel(postsLikeSchema(), {
			collectionId: "posts",
			form,
		});

		if (model.layout.kind !== "stack") throw new Error("expected stack");
		const cols = model.layout.content[0];
		expect(cols?.kind).toBe("columns");
		if (cols?.kind !== "columns") throw new Error("expected columns");
		expect(cols.content).toHaveLength(2);
		expect(cols.content[0]).toMatchObject({
			kind: "column",
			id: "col-0",
			width: 1,
		});
		expect(cols.content[0]?.content[0]).toEqual({
			kind: "field",
			path: "title",
		});
		expect(cols.content[1]?.content[0]).toMatchObject({
			kind: "group",
			label: "Flags",
		});
	});

	test("missing form tree keeps flat stack + stock-by-kind", () => {
		const withForm = projectSchemaFormModel(postsLikeSchema(), {
			collectionId: "posts",
			form: undefined,
		});
		const without = projectSchemaFormModel(postsLikeSchema(), {
			collectionId: "posts",
		});
		expect(withForm.layout).toEqual(without.layout);
		expect(withForm.fields.title?.semanticKind).toBe("string");
		expect(withForm.layout.kind).toBe("stack");
	});

	test("unknown field keys in the form tree fail closed at runtime", () => {
		const { field } = createFormTreeHelpers<PostsData & { nope: string }>();
		const form = [field("nope")];

		expect(() =>
			projectSchemaFormModel(postsLikeSchema(), {
				collectionId: "posts",
				form,
			}),
		).toThrow(/unknown field/i);
	});
});
