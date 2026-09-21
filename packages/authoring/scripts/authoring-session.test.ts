/**
 * Authoring session seam (architecture candidate #2).
 * Guarded write-back, create→edit remount, preview eligibility, capability gates.
 * Debounce stays an internal seam — exercised only as observable timing.
 */

import { describe, expect, test } from "bun:test";
import { resolveCmsCapabilities } from "@cms/core/fetch-client";
import { createDraftEligibility } from "../src/draft-eligibility";
import { createAuthoringSession } from "../src/session";
import {
	createFakeTimers,
	sampleEntry,
	waitUntil,
} from "./authoring-test-fixtures";
import { createFakeClient } from "./fake-client";

const titleEligible = createDraftEligibility({
	type: "object",
	properties: { title: { type: "string", minLength: 1 } },
	required: ["title"],
	additionalProperties: false,
});

const alwaysEligible = () => true;

describe("authoring session", () => {
	test("edit: guarded revision, no remount, preview after write-back", async () => {
		const fake = createFakeClient({ entries: [sampleEntry] });
		const clock = createFakeTimers();
		const session = createAuthoringSession({
			client: fake.client,
			collection: "posts",
			mode: { kind: "edit", entry: sampleEntry },
			isClientValid: titleEligible,
			capabilities: resolveCmsCapabilities({ deleteEntry: true }),
			getPreviewUrl: (c, id) => `/${c}/${id}`,
			debounceMs: 50,
			timers: clock.timers,
		});

		const epoch0 = session.getSnapshot().formEpoch;
		expect(session.getSnapshot().previewUrl).toBeNull();

		session.handleChange({ title: "Hello edited" });
		clock.advance(50);
		await waitUntil(
			() => session.getSnapshot().saveStatus === "saved",
			"edit save",
		);

		expect(fake.upsertCalls).toHaveLength(1);
		expect(fake.upsertCalls[0]?.expectedRevision).toBe("rev-1");

		const snap = session.getSnapshot();
		expect(snap.formEpoch).toBe(epoch0);
		expect(snap.revision).toBe("rev-2");
		expect(snap.previewUrl).toBe("/posts/hello");

		session.handleChange({ title: "Again" });
		clock.advance(50);
		await waitUntil(
			() => session.getSnapshot().saveStatus === "saved",
			"second edit",
		);
		expect(fake.upsertCalls[1]?.expectedRevision).toBe("rev-2");

		session.dispose();
	});

	test("create: null revision, remount into edit, preview eligibility", async () => {
		const fake = createFakeClient({ entries: [] });
		const clock = createFakeTimers();
		const session = createAuthoringSession({
			client: fake.client,
			collection: "posts",
			mode: { kind: "create" },
			isClientValid: titleEligible,
			capabilities: resolveCmsCapabilities({ deleteEntry: true }),
			getPreviewUrl: (c, id) => `/preview/${c}/${id}`,
			debounceMs: 50,
			timers: clock.timers,
		});

		expect(session.getSnapshot().creating).toBe(true);
		expect(session.getSnapshot().previewUrl).toBeNull();

		session.handleChange({ title: "New" });
		clock.advance(50);
		await waitUntil(
			() => session.getSnapshot().saveStatus === "client_invalid",
			"create without id",
		);
		expect(fake.upsertCalls).toHaveLength(0);

		const epoch0 = session.getSnapshot().formEpoch;
		session.setCreateId("brand-new");
		session.handleChange({ title: "New" });
		clock.advance(50);
		await waitUntil(
			() =>
				!session.getSnapshot().creating &&
				session.getSnapshot().saveStatus === "saved",
			"create save",
		);

		expect(fake.upsertCalls[0]?.expectedRevision).toBeNull();

		const snap = session.getSnapshot();
		expect(snap.creating).toBe(false);
		expect(snap.entryId).toBe("brand-new");
		expect(snap.formEpoch).toBeGreaterThan(epoch0);
		expect(snap.previewUrl).toBe("/preview/posts/brand-new");

		session.dispose();
	});

	test("capabilities gate delete/upload when unsupported", () => {
		const fake = createFakeClient({
			capabilities: resolveCmsCapabilities({
				deleteEntry: false,
				assets: { uploadImage: false },
			}),
			entries: [sampleEntry],
		});
		const session = createAuthoringSession({
			client: fake.client,
			collection: "posts",
			mode: { kind: "edit", entry: sampleEntry },
			isClientValid: alwaysEligible,
			capabilities: resolveCmsCapabilities({
				deleteEntry: false,
				assets: { uploadImage: false },
			}),
		});
		const snap = session.getSnapshot();
		expect(snap.canDelete).toBe(false);
		expect(snap.canUploadAssets).toBe(false);

		const disabledAssets = session.assetsContext();
		expect(disabledAssets.uploadEnabled).toBe(false);
		expect(disabledAssets.uploadImage).toBeUndefined();

		session.dispose();
	});

	test("capabilities offer delete/upload; assetsContext returns field path", async () => {
		const fake = createFakeClient({
			capabilities: resolveCmsCapabilities({
				deleteEntry: true,
				assets: { uploadImage: true, maxUploadBytes: 1024 },
			}),
			entries: [sampleEntry],
		});
		const session = createAuthoringSession({
			client: fake.client,
			collection: "posts",
			mode: { kind: "edit", entry: sampleEntry },
			isClientValid: alwaysEligible,
			capabilities: resolveCmsCapabilities({
				deleteEntry: true,
				assets: { uploadImage: true, maxUploadBytes: 1024 },
			}),
		});
		const snap = session.getSnapshot();
		expect(snap.canDelete).toBe(true);
		expect(snap.canUploadAssets).toBe(true);
		expect(snap.maxUploadBytes).toBe(1024);

		const assets = session.assetsContext();
		expect(assets.uploadEnabled).toBe(true);
		expect(assets.maxUploadBytes).toBe(1024);
		expect(assets.uploadImage).toBeDefined();
		if (!assets.uploadImage) return;

		const uploaded = await assets.uploadImage({
			file: new Blob([new Uint8Array([1, 2, 3])]),
			collection: "posts",
			id: "hello",
			name: "cover",
			filename: "x.png",
		});
		expect(uploaded.ok).toBe(true);
		if (uploaded.ok) {
			expect(typeof uploaded.path).toBe("string");
			expect(uploaded.path).toBeTruthy();
			expect("value" in uploaded).toBe(false);
		}
		expect(fake.uploadCalls).toBe(1);

		session.dispose();
	});

	test("assetsContext failure is message-only when client refuses", async () => {
		const fake = createFakeClient({
			capabilities: resolveCmsCapabilities({
				deleteEntry: true,
				assets: { uploadImage: false },
			}),
			entries: [sampleEntry],
		});
		// Session claims upload supported only from capabilities; force-call via a
		// session that offers upload but client refuses (capability flip mid-flight).
		const session = createAuthoringSession({
			client: fake.client,
			collection: "posts",
			mode: { kind: "edit", entry: sampleEntry },
			isClientValid: alwaysEligible,
			capabilities: resolveCmsCapabilities({
				deleteEntry: true,
				assets: { uploadImage: true },
			}),
		});
		const assets = session.assetsContext();
		expect(assets.uploadImage).toBeDefined();
		if (!assets.uploadImage) return;

		const refused = await assets.uploadImage({
			file: new Blob([new Uint8Array([1])]),
			collection: "posts",
			id: "hello",
		});
		expect(refused.ok).toBe(false);
		if (!refused.ok) {
			expect("message" in refused).toBe(true);
			expect("code" in refused).toBe(false);
		}

		session.dispose();
	});

	test("conflict reload remounts with canonical revision", async () => {
		const fake = createFakeClient({
			entries: [sampleEntry],
			conflictOnRevision: "rev-1",
		});
		const clock = createFakeTimers();
		const session = createAuthoringSession({
			client: fake.client,
			collection: "posts",
			mode: { kind: "edit", entry: sampleEntry },
			isClientValid: titleEligible,
			debounceMs: 50,
			timers: clock.timers,
		});

		session.handleChange({ title: "Stale" });
		clock.advance(50);
		await waitUntil(
			() => session.getSnapshot().saveStatus === "conflict",
			"conflict",
		);

		// Mutate store as if another writer won.
		fake.store[0] = {
			...sampleEntry,
			data: { title: "Canonical" },
			revision: "rev-other",
		};
		const epochBefore = session.getSnapshot().formEpoch;
		await session.reload();
		const snap = session.getSnapshot();
		expect(snap.formEpoch).toBeGreaterThan(epochBefore);
		expect(snap.revision).toBe("rev-other");
		expect(snap.formValue.title).toBe("Canonical");

		session.dispose();
	});

	test("edit: invalid draft data skips write-back", async () => {
		const fake = createFakeClient({ entries: [sampleEntry] });
		const clock = createFakeTimers();
		const session = createAuthoringSession({
			client: fake.client,
			collection: "posts",
			mode: { kind: "edit", entry: sampleEntry },
			isClientValid: titleEligible,
			debounceMs: 50,
			timers: clock.timers,
		});

		session.handleChange({ title: "" });
		clock.advance(50);
		await waitUntil(
			() => session.getSnapshot().saveStatus === "client_invalid",
			"invalid title",
		);
		expect(fake.upsertCalls).toHaveLength(0);

		session.dispose();
	});
});
