import { describe, expect, test } from "bun:test";
import { createFormTreeHelpers } from "@cms/core/form-tree";
import {
	CONTENT_FIELD_STAMP,
	projectSchemaFormModel,
} from "@cms/core/semantic";
import { createFormValidator } from "@sjsf/ajv8-validator";
import { z } from "zod";
import { lowerFormModelToSjsf } from "./lower-sjsf";
import {
	getStockEditor,
	resolveCatalogBinding,
	resolveFieldEditor,
	stockEditorRegistry,
} from "./stock-registry";

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

function postsFormModel() {
	const posts = z.object({
		title: z.string().min(1),
		cover: stampImage(z.string()).optional(),
		author: stampReference(z.string(), "authors"),
		count: z.number().int(),
	});

	type PostsData = {
		title: string;
		cover?: string;
		author: string;
		count: number;
	};
	const { field } = createFormTreeHelpers<PostsData>();

	return projectSchemaFormModel(posts, {
		collectionId: "posts",
		form: [
			field("title").label("Title"),
			field("cover"),
			field("author").editor("AuthorPickerToken"),
			field("count"),
		],
	});
}

describe("stockEditorRegistry", () => {
	test("selects stock editors by semantic kind", () => {
		expect(getStockEditor("string").sjsfWidget).toBe("textWidget");
		expect(getStockEditor("number").sjsfWidget).toBe("numberWidget");
		expect(getStockEditor("boolean").sjsfWidget).toBe("checkboxWidget");
		expect(getStockEditor("image").componentKey).toBe("imageField");
		expect(getStockEditor("reference").stub).toBe(true);
		expect(getStockEditor("reference").componentKey).toBe("referenceField");
		expect(stockEditorRegistry.enum.sjsfWidget).toBe("selectWidget");
	});

	test("field component override wins over stock", () => {
		const model = postsFormModel();
		const author = model.fields.author;
		expect(author).toBeDefined();
		if (!author) throw new Error("missing author");

		const live = {
			AuthorPickerToken: { name: "LiveAuthorPicker" },
		};
		const resolved = resolveFieldEditor(author, {
			resolveBinding: resolveCatalogBinding(live),
		});
		expect(resolved.source).toBe("override");
		if (resolved.source === "override") {
			expect(resolved.component).toEqual({ name: "LiveAuthorPicker" });
		}

		const title = model.fields.title;
		expect(title).toBeDefined();
		if (!title) throw new Error("missing title");
		const stock = resolveFieldEditor(title);
		expect(stock.source).toBe("stock");
		if (stock.source === "stock") {
			expect(stock.entry.kind).toBe("string");
		}
	});
});

describe("lowerFormModelToSjsf", () => {
	test("lowers schema form model to Ajv-safe schema + uiSchema", () => {
		const model = postsFormModel();

		const { schema, uiSchema } = lowerFormModelToSjsf(model, {
			resolveBinding: (token) => token,
		});

		expect(schema.$schema).toBeUndefined();
		expect(schema.type).toBe("object");
		const props = schema.properties as Record<string, unknown>;
		expect(props.title).toMatchObject({ type: "string", minLength: 1 });

		expect(uiSchema.title).toMatchObject({
			"ui:options": { title: "Title" },
		});
		expect(uiSchema.cover).toMatchObject({
			"ui:components": { textWidget: "imageField" },
		});
		expect(uiSchema.author).toMatchObject({
			"ui:components": { textWidget: "AuthorPickerToken" },
		});

		const validator = createFormValidator();
		expect(
			validator.isValid(schema as never, schema as never, {
				title: "Hello",
				author: "ada",
				count: 1,
			}),
		).toBe(true);
		expect(
			validator.isValid(schema as never, schema as never, {
				title: 1,
				author: "ada",
				count: 1,
			}),
		).toBe(false);
	});

	test("strips $schema / ui / config from form-model jsonSchema", () => {
		const model = postsFormModel();

		const dirty = {
			...model,
			jsonSchema: {
				...model.jsonSchema,
				$schema: "https://json-schema.org/draft/2020-12/schema",
				ui: { widget: "object" },
				config: { label: "Posts" },
				properties: {
					...(model.jsonSchema.properties as Record<string, unknown>),
					title: {
						...((model.jsonSchema.properties as Record<string, unknown>)
							.title as object),
						ui: { widget: "text" },
					},
				},
			},
		};

		const { schema } = lowerFormModelToSjsf(dirty);
		expect(schema.$schema).toBeUndefined();
		expect("ui" in schema).toBe(false);
		expect("config" in schema).toBe(false);
		const title = (schema.properties as Record<string, Record<string, unknown>>)
			.title;
		expect("ui" in title).toBe(false);

		const validator = createFormValidator();
		expect(
			validator.isValid(schema as never, schema as never, {
				title: "Ok",
				author: "ada",
				count: 1,
			}),
		).toBe(true);
	});
});
