/**
 * Authoring-application deletion capability (issue #16).
 * Uses a fake protocol client through the public AuthoringClient seam.
 */

import { describe, expect, test } from "bun:test";
import { resolveCmsCapabilities } from "@cms/crud/fetch-client";
import { offersEntryDeletion } from "../src/session";
import { sampleEntry } from "./authoring-test-fixtures";
import { createFakeClient } from "./fake-client";

describe("authoring deletion capability", () => {
	test("offersEntryDeletion true when capability set", () => {
		expect(
			offersEntryDeletion(resolveCmsCapabilities({ deleteEntry: true })),
		).toBe(true);
	});

	test("offersEntryDeletion false when capability unset", () => {
		expect(
			offersEntryDeletion(resolveCmsCapabilities({ deleteEntry: false })),
		).toBe(false);
	});

	test("offersEntryDeletion false when capabilities unknown", () => {
		expect(offersEntryDeletion(null)).toBe(false);
		expect(offersEntryDeletion(undefined)).toBe(false);
	});

	test("supported capability offers deletion control and refreshes list", async () => {
		const fake = createFakeClient({
			capabilities: resolveCmsCapabilities({ deleteEntry: true }),
			entries: [sampleEntry],
		});
		const caps = await fake.client.getCapabilities();
		const offer = offersEntryDeletion(caps.value);
		expect(offer).toBe(true);

		const result = await fake.client.deleteEntry("posts", "hello");
		expect(result.ok).toBe(true);

		const listed = await fake.client.listEntries("posts");
		expect(listed.value.some((e) => e.id === "hello")).toBe(false);
		expect(fake.deleteCalls).toHaveLength(1);
	});

	test("unsupported capability hides deletion; typed refuse leaves entry", async () => {
		const fake = createFakeClient({
			capabilities: resolveCmsCapabilities({ deleteEntry: false }),
			entries: [sampleEntry],
		});
		const caps = await fake.client.getCapabilities();
		expect(offersEntryDeletion(caps.value)).toBe(false);
		expect(fake.deleteCalls).toHaveLength(0);

		const refused = await fake.client.deleteEntry("posts", "hello");
		expect(refused.ok).toBe(false);
		if (!refused.ok) {
			expect(refused.code).toBe("unsupported_capability");
		}

		const still = await fake.client.getEntry("posts", "hello");
		expect(still.ok).toBe(true);
	});
});
