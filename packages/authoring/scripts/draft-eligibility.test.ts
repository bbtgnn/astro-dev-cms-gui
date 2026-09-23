/**
 * Draft-write eligibility from Ajv-safe editor schema (AJV).
 * Session injects the predicate; this module owns the default adapter.
 * Dirty Form model schemas must be lowered first (see lowerFormModelToSjsf /
 * ajv-schema tests) — this module does not strip.
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
});
