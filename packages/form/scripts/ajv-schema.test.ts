/**
 * Guard: Zod→JSON Schema after stripUiFromJsonSchema must validate under
 * @sjsf/ajv8-validator (regression: draft/2020-12 $schema threw and blocked Submit).
 */

import { describe, expect, test } from "bun:test";
import {
	boolean,
	config,
	markdown,
	object,
	reference,
	stripUiFromJsonSchema,
	text,
	toFormSchemas,
} from "@cms/fields";
import { createFormValidator } from "@sjsf/ajv8-validator";

const posts = object(
	{
		title: text({ label: "Title" }),
		draft: boolean({ label: "Draft", default: false }),
		body: markdown({ label: "Body" }),
		author: reference("authors", { label: "Author" }),
	},
	{ label: "Posts" },
).meta(config({ label: "Posts", base: "posts" }));

describe("stripUiFromJsonSchema is Ajv-safe", () => {
	const { schema } = toFormSchemas(posts);
	const stripped = stripUiFromJsonSchema(schema);
	const validator = createFormValidator();

	test("removes $schema and root ui/config", () => {
		expect(stripped.$schema).toBeUndefined();
		expect("ui" in stripped).toBe(false);
		expect("config" in stripped).toBe(false);
	});

	test("removes ui from each property node", () => {
		const props = stripped.properties as Record<
			string,
			Record<string, unknown>
		>;
		for (const [key, node] of Object.entries(props)) {
			expect({ field: key, hasUi: "ui" in node }).toEqual({
				field: key,
				hasUi: false,
			});
		}
	});

	test("Ajv accepts a valid sample posts value", () => {
		const ok = validator.isValid(stripped as never, stripped as never, {
			title: "Hello tracer",
			draft: true,
			body: "Pass 1 fake entry.",
			author: "ada",
		});
		expect(ok).toBe(true);
	});

	test("Ajv rejects an invalid title type", () => {
		const bad = validator.isValid(stripped as never, stripped as never, {
			title: 123,
			draft: true,
			body: "x",
			author: "ada",
		});
		expect(bad).toBe(false);
	});
});
