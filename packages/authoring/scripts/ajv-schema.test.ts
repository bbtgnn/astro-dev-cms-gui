/**
 * Guard: stripUiFromJsonSchema must leave JSON Schema Ajv-safe
 * (regression: draft/2020-12 $schema threw and blocked Submit).
 */

import { describe, expect, test } from "bun:test";
import { stripUiFromJsonSchema } from "@cms/core/semantic";
import { createFormValidator } from "@sjsf/ajv8-validator";

const postsSchema: Record<string, unknown> = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	type: "object",
	ui: { widget: "object" },
	config: { label: "Posts", base: "posts" },
	properties: {
		title: {
			type: "string",
			ui: { widget: "text", label: "Title" },
		},
		draft: {
			type: "boolean",
			default: false,
			ui: { widget: "boolean", label: "Draft" },
		},
		body: {
			type: "string",
			ui: { widget: "markdown", label: "Body" },
		},
		author: {
			type: "string",
			ui: { widget: "reference", label: "Author" },
		},
	},
	required: ["title", "body", "author"],
	additionalProperties: false,
};

describe("stripUiFromJsonSchema is Ajv-safe", () => {
	const stripped = stripUiFromJsonSchema(postsSchema);
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
