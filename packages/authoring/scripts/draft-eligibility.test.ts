/**
 * Draft-write eligibility from form-model JSON Schema (AJV).
 * Session injects the predicate; this module owns the default adapter.
 */

import { describe, expect, test } from "bun:test";
import { createDraftEligibility } from "../src/draft-eligibility";

const titleSchema: Record<string, unknown> = {
	type: "object",
	properties: { title: { type: "string", minLength: 1 } },
	required: ["title"],
	additionalProperties: false,
};

describe("createDraftEligibility", () => {
	test("accepts structurally valid persisted input", () => {
		const eligible = createDraftEligibility(titleSchema);
		expect(eligible({ title: "Hello" })).toBe(true);
	});

	test("rejects structurally invalid persisted input", () => {
		const eligible = createDraftEligibility(titleSchema);
		expect(eligible({ title: "" })).toBe(false);
		expect(eligible({})).toBe(false);
	});

	test("strips form-model ui / $schema before Ajv", () => {
		const withUi: Record<string, unknown> = {
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			ui: { widget: "object" },
			properties: {
				title: {
					type: "string",
					minLength: 1,
					ui: { widget: "text" },
				},
			},
			required: ["title"],
			additionalProperties: false,
		};
		const eligible = createDraftEligibility(withUi);
		expect(eligible({ title: "Ok" })).toBe(true);
		expect(eligible({ title: "" })).toBe(false);
	});
});
