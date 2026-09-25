/**
 * Authoring-application deletion capability (issue #16).
 * Uses a fake protocol client through the public AuthoringClient seam.
 * Capability chrome is owned by the Authoring session (`getSnapshot().canDelete`).
 */

import { describe, expect, test } from "bun:test";
import { resolveCmsCapabilities } from "@cms/core/fetch-client";
import { sampleEntry } from "../testing/authoring-test-fixtures";
import { createFakeClient } from "../testing/fake-client";
import { createAuthoringSession } from "./session";

const alwaysEligible = () => true;

function sessionWithCaps(
	capabilities: ReturnType<typeof resolveCmsCapabilities> | null | undefined,
) {
	const fake = createFakeClient({
		capabilities:
			capabilities ?? resolveCmsCapabilities({ deleteEntry: false }),
		entries: [sampleEntry],
	});
	const session = createAuthoringSession({
		client: fake.client,
		collection: "posts",
		mode: { kind: "edit", entry: sampleEntry },
		isClientValid: alwaysEligible,
		capabilities,
	});
	return { fake, session };
}

describe("authoring deletion capability", () => {
	test("session canDelete true when capability set", () => {
		const { session } = sessionWithCaps(
			resolveCmsCapabilities({ deleteEntry: true }),
		);
		expect(session.getSnapshot().canDelete).toBe(true);
		session.dispose();
	});

	test("session canDelete false when capability unset", () => {
		const { session } = sessionWithCaps(
			resolveCmsCapabilities({ deleteEntry: false }),
		);
		expect(session.getSnapshot().canDelete).toBe(false);
		session.dispose();
	});

	test("session canDelete false when capabilities unknown", () => {
		const { session: nullSession } = sessionWithCaps(null);
		expect(nullSession.getSnapshot().canDelete).toBe(false);
		nullSession.dispose();

		const { session: undefinedSession } = sessionWithCaps(undefined);
		expect(undefinedSession.getSnapshot().canDelete).toBe(false);
		undefinedSession.dispose();
	});

	test("supported capability offers deletion control and refreshes list", async () => {
		const { fake, session } = sessionWithCaps(
			resolveCmsCapabilities({ deleteEntry: true }),
		);
		expect(session.getSnapshot().canDelete).toBe(true);

		const result = await fake.client.deleteEntry("posts", "hello");
		expect(result.ok).toBe(true);

		const listed = await fake.client.listEntries("posts");
		expect(listed.value.some((e) => e.id === "hello")).toBe(false);
		expect(fake.deleteCalls).toHaveLength(1);

		session.dispose();
	});

	test("unsupported capability hides deletion; typed refuse leaves entry", async () => {
		const { fake, session } = sessionWithCaps(
			resolveCmsCapabilities({ deleteEntry: false }),
		);
		expect(session.getSnapshot().canDelete).toBe(false);
		expect(fake.deleteCalls).toHaveLength(0);

		const refused = await fake.client.deleteEntry("posts", "hello");
		expect(refused.ok).toBe(false);
		if (!refused.ok) {
			expect(refused.code).toBe("unsupported_capability");
		}

		const still = await fake.client.getEntry("posts", "hello");
		expect(still.ok).toBe(true);

		session.dispose();
	});
});
