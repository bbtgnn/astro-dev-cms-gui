/**
 * Authoring-application assets capability (issue #17).
 * Uses a fake protocol client through the public AuthoringClient seam.
 */

import { describe, expect, test } from "bun:test";
import { resolveCmsCapabilities } from "@cms/core/fetch-client";
import { offersAssetUpload } from "../src/session";
import { sampleEntry } from "./authoring-test-fixtures";
import { createFakeClient } from "./fake-client";

const supportedCaps = resolveCmsCapabilities({
	deleteEntry: true,
	assets: { uploadImage: true },
});
const unsupportedCaps = resolveCmsCapabilities({
	deleteEntry: true,
	assets: { uploadImage: false },
});

describe("authoring assets capability", () => {
	test("offersAssetUpload true when capability set", () => {
		expect(offersAssetUpload(supportedCaps)).toBe(true);
	});

	test("offersAssetUpload false when capability unset", () => {
		expect(offersAssetUpload(unsupportedCaps)).toBe(false);
	});

	test("offersAssetUpload false when capabilities unknown", () => {
		expect(offersAssetUpload(null)).toBe(false);
		expect(offersAssetUpload(undefined)).toBe(false);
	});

	test("supported capability uploads and persists asset reference", async () => {
		const fake = createFakeClient({
			capabilities: supportedCaps,
			entries: [sampleEntry],
		});
		const caps = await fake.client.getCapabilities();
		expect(offersAssetUpload(caps.value)).toBe(true);

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
	});

	test("unsupported capability hides upload; typed refuse leaves entry clean", async () => {
		const fake = createFakeClient({
			capabilities: unsupportedCaps,
			entries: [sampleEntry],
		});
		const caps = await fake.client.getCapabilities();
		expect(offersAssetUpload(caps.value)).toBe(false);
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
	});
});
