/**
 * Regression: fieldKindBrand must exist at runtime (not type-only declare).
 * Browser symptom: ReferenceError: fieldKindBrand is not defined in createFieldControl.
 */

import { describe, expect, test } from "bun:test";
import { createFieldControl } from "../src/config/contracts";

describe("createFieldControl", () => {
	test("builds a control without ReferenceError on the kind brand", () => {
		let value = "hello";
		const control = createFieldControl<string, "string">({
			getValue: () => value,
			setValue: (next) => {
				value = next;
			},
			getErrors: () => [],
			getDisabled: () => false,
		});

		expect(control.value).toBe("hello");
		expect(control.errors).toEqual([]);
		expect(control.disabled).toBe(false);
		control.set("world");
		expect(value).toBe("world");
		expect(control.value).toBe("world");
	});
});
