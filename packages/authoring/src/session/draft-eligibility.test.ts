/** Must receive already-lowered Ajv-safe schema (see ajv-schema tests). */

import { describe, expect, test } from "bun:test";
import { createDraftEligibility } from "./draft-eligibility";

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
});
