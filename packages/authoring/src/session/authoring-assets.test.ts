/**
 * Authoring-application assets capability (issue #17).
 * Uses a fake protocol client through the public AuthoringClient seam.
 * Capability chrome is owned by the Authoring session (`assetsContext()`).
 */

import { describe, expect, test } from "bun:test";
import { resolveCmsCapabilities } from "@cms/core/fetch-client";
import { sampleEntry } from "../testing/authoring-test-fixtures";
import { createFakeClient } from "../testing/fake-client";
import { createAuthoringSession } from "./session";

const supportedCaps = resolveCmsCapabilities({
	deleteEntry: true,
	assets: { uploadImage: true },
});
const unsupportedCaps = resolveCmsCapabilities({
	deleteEntry: true,
	assets: { uploadImage: false },
});

const alwaysEligible = () => true;

function sessionWithCaps(
	capabilities: ReturnType<typeof resolveCmsCapabilities> | null | undefined,
) {
	const fake = createFakeClient({
		capabilities: capabilities ?? unsupportedCaps,
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

describe("authoring assets capability", () => {
	test("assetsContext uploadEnabled when capability set", () => {
		const { session } = sessionWithCaps(supportedCaps);
		expect(session.getSnapshot().canUploadAssets).toBe(true);
		expect(session.assetsContext().uploadEnabled).toBe(true);
		session.dispose();
	});

	test("assetsContext disabled when capability unset", () => {
		const { session } = sessionWithCaps(unsupportedCaps);
		expect(session.getSnapshot().canUploadAssets).toBe(false);
		expect(session.assetsContext().uploadEnabled).toBe(false);
		expect(session.assetsContext().uploadImage).toBeUndefined();
		session.dispose();
	});

	test("assetsContext disabled when capabilities unknown", () => {
		const { session: nullSession } = sessionWithCaps(null);
		expect(nullSession.getSnapshot().canUploadAssets).toBe(false);
		expect(nullSession.assetsContext().uploadEnabled).toBe(false);
		nullSession.dispose();

		const { session: undefinedSession } = sessionWithCaps(undefined);
		expect(undefinedSession.getSnapshot().canUploadAssets).toBe(false);
		expect(undefinedSession.assetsContext().uploadEnabled).toBe(false);
		undefinedSession.dispose();
	});

	test("supported capability uploads and persists asset reference", async () => {
		const { fake, session } = sessionWithCaps(supportedCaps);
		const assets = session.assetsContext();
		expect(assets.uploadEnabled).toBe(true);
		expect(assets.uploadImage).toBeDefined();

		const uploaded = await fake.client.uploadImage({
			file: new Blob([new Uint8Array([1, 2, 3])]),
			collection: "posts",
			id: "hello",
			name: "cover",
			filename: "x.png",
		});
		expect(uploaded.ok).toBe(true);
		if (!uploaded.ok) return;

		const saved = await fake.client.upsertEntry({
			id: "hello",
			collection: "posts",
			data: { title: "Hello", cover: uploaded.value.path },
			expectedRevision: "rev-1",
		});
		expect(saved.ok).toBe(true);
		if (saved.ok) {
			expect(saved.value.data.cover).toBe(uploaded.value.path);
		}
		expect(fake.uploadCalls).toBe(1);

		session.dispose();
	});

	test("unsupported capability hides upload; typed refuse leaves entry clean", async () => {
		const { fake, session } = sessionWithCaps(unsupportedCaps);
		expect(session.assetsContext().uploadEnabled).toBe(false);
		expect(fake.uploadCalls).toBe(0);

		const refused = await fake.client.uploadImage({
			file: new Blob([new Uint8Array([1])]),
			collection: "posts",
			id: "hello",
		});
		expect(refused.ok).toBe(false);
		if (!refused.ok) {
			expect(refused.code).toBe("unsupported_capability");
		}

		const still = await fake.client.getEntry("posts", "hello");
		expect(still.ok).toBe(true);
		if (still.ok) {
			expect(still.value.data.cover).toBeUndefined();
		}

		session.dispose();
	});
});
