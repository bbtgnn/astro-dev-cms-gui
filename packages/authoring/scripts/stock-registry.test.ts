/**
 * ADR-0019 slice 5 — stock-by-kind registry + IR → SJSF lowering.
 */

import { describe, expect, test } from "bun:test";
import { compileSemanticIr, projectFormModels, s } from "@cms/core/semantic";
import { createFormValidator } from "@sjsf/ajv8-validator";
import { lowerFormModelToSjsf } from "../src/form/lower-sjsf";
import {
	getStockEditor,
	resolveCatalogBinding,
	resolveFieldEditor,
	stockEditorRegistry,
} from "../src/form/stock-registry";

function postsIr() {
	return compileSemanticIr({
		collections: {
			posts: s.collection({
				loader: s.glob({ base: "./posts", pattern: "**/*.json" }),
				schema: s.stack([
					s.field({
						id: "title",
						label: "Title",
						schema: s.string().min(1),
					}),
					s.field({
						id: "cover",
						schema: s.image().optional(),
					}),
					s.field({
						id: "author",
						schema: s.reference("authors"),
					}).editor("AuthorPickerToken"),
					s.field({
						id: "count",
						schema: s.number().int(),
					}),
				]),
			}),
		},
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
		const ir = postsIr();
		const model = projectFormModels(ir).posts;
		const author = model?.fields.author;
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

		const title = model?.fields.title;
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
	test("lowers IR form model to Ajv-safe schema + uiSchema", () => {
		const ir = postsIr();
		const model = projectFormModels(ir).posts;
		expect(model).toBeDefined();
		if (!model) throw new Error("missing model");

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
		const ir = postsIr();
		const model = projectFormModels(ir).posts;
		expect(model).toBeDefined();
		if (!model) throw new Error("missing model");

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
