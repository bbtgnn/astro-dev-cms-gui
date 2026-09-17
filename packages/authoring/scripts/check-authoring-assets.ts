/**
 * Authoring-application assets capability check (issue #17).
 * Uses a fake protocol client through the public AuthoringClient seam.
 *
 * Run: bun run packages/authoring/scripts/check-authoring-assets.ts
 */
import {
	type CmsCapabilities,
	type ContentEntry,
	cmsErr,
	cmsOk,
	type DeleteEntryResult,
	type GetCapabilitiesResult,
	type ListCollectionsResult,
	type ListEntriesResult,
	resolveCmsCapabilities,
	type SaveEntryResult,
	type UploadImageResult,
} from "@cms/crud/fetch-client";
import { offersAssetUpload } from "../src/capabilities";
import type { AuthoringClient } from "../src/types";

type Failure = { label: string; detail: string };

const failures: Failure[] = [];
const passed: string[] = [];

function ok(label: string): void {
	passed.push(label);
}

function fail(label: string, detail: string): void {
	failures.push({ label, detail });
}

function createFakeClient(opts: {
	capabilities: CmsCapabilities;
	entries: ContentEntry[];
}): {
	client: AuthoringClient;
	uploadCalls: number;
} {
	const store = [...opts.entries];
	let uploadCalls = 0;

	const client: AuthoringClient = {
		async getCapabilities(): Promise<GetCapabilitiesResult> {
			return cmsOk(opts.capabilities);
		},
		async listCollections(): Promise<ListCollectionsResult> {
			return cmsOk([{ name: "posts", label: "Posts" }]);
		},
		async listEntries(collection: string): Promise<ListEntriesResult> {
			const value = store
				.filter((e) => e.collection === collection)
				.map((e) => ({ collection: e.collection, id: e.id }));
			return cmsOk(value);
		},
		async getEntry(collection: string, id: string) {
			const hit = store.find((e) => e.collection === collection && e.id === id);
			if (!hit) return cmsErr("not_found", "Not found");
			return cmsOk(hit);
		},
		async upsertEntry(input): Promise<SaveEntryResult> {
			const idx = store.findIndex(
				(e) => e.collection === input.collection && e.id === input.id,
			);
			const next: ContentEntry = {
				id: input.id,
				collection: input.collection,
				data: input.data,
				revision: `rev-${Date.now()}`,
			};
			if (idx >= 0) store[idx] = next;
			else store.push(next);
			return cmsOk(next);
		},
		async deleteEntry(): Promise<DeleteEntryResult> {
			return cmsErr("forbidden", "not used in this check");
		},
		async uploadImage(input): Promise<UploadImageResult> {
			uploadCalls += 1;
			if (!opts.capabilities.assets.uploadImage) {
				return cmsErr(
					"unsupported_capability",
					"Image upload is not supported",
				);
			}
			return cmsOk({
				path: `./${input.id}/cover/cover.webp`,
				files: [`posts/${input.id}/cover/cover.webp`],
				widths: opts.capabilities.assets.defaultWidths,
			});
		},
	};

	return {
		client,
		get uploadCalls() {
			return uploadCalls;
		},
	};
}

const sample: ContentEntry = {
	id: "hello",
	collection: "posts",
	data: { title: "Hello" },
	revision: "rev-1",
};

const supportedCaps = resolveCmsCapabilities({
	deleteEntry: true,
	assets: { uploadImage: true },
});
const unsupportedCaps = resolveCmsCapabilities({
	deleteEntry: true,
	assets: { uploadImage: false },
});

// --- Capability helper ---
if (offersAssetUpload(supportedCaps)) {
	ok("offersAssetUpload true when capability set");
} else {
	fail("offersAssetUpload true when capability set", "expected true");
}

if (!offersAssetUpload(unsupportedCaps)) {
	ok("offersAssetUpload false when capability unset");
} else {
	fail("offersAssetUpload false when capability unset", "expected false");
}

if (!offersAssetUpload(null) && !offersAssetUpload(undefined)) {
	ok("offersAssetUpload false when capabilities unknown");
} else {
	fail(
		"offersAssetUpload false when capabilities unknown",
		"expected false for null/undefined",
	);
}

// --- Supported: authoring would offer upload, call protocol, then save path ---
{
	const fake = createFakeClient({
		capabilities: supportedCaps,
		entries: [sample],
	});
	const caps = await fake.client.getCapabilities();
	const offer = offersAssetUpload(caps.value);
	if (!offer) {
		fail("supported capability offers asset upload", "canUpload=false");
	} else {
		ok("supported capability offers asset upload");
	}

	if (offer) {
		const uploaded = await fake.client.uploadImage({
			file: new Blob([new Uint8Array([1, 2, 3])]),
			collection: "posts",
			id: "hello",
			name: "cover",
			filename: "x.png",
		});
		if (!uploaded.ok) {
			fail(
				"supported upload through client succeeds",
				JSON.stringify(uploaded),
			);
		} else {
			ok("supported upload through client succeeds");
			const saved = await fake.client.upsertEntry({
				id: "hello",
				collection: "posts",
				data: { title: "Hello", cover: uploaded.value.path },
				expectedRevision: "rev-1",
			});
			if (!saved.ok || saved.value.data.cover !== uploaded.value.path) {
				fail(
					"supported path save persists asset reference",
					JSON.stringify(saved),
				);
			} else {
				ok("supported path save persists asset reference");
			}
		}
		if (fake.uploadCalls !== 1) {
			fail(
				"supported path issues one uploadImage call",
				String(fake.uploadCalls),
			);
		} else {
			ok("supported path issues one uploadImage call");
		}
	}
}

// --- Unsupported: hide control; no uploadImage transport call ---
{
	const fake = createFakeClient({
		capabilities: unsupportedCaps,
		entries: [sample],
	});
	const caps = await fake.client.getCapabilities();
	const offer = offersAssetUpload(caps.value);
	if (offer) {
		fail("unsupported capability hides asset upload", "canUpload=true");
	} else {
		ok("unsupported capability hides asset upload");
	}

	// Authoring must not call upload when unsupported (mirrors ImageField gating).
	if (fake.uploadCalls !== 0) {
		fail(
			"unsupported path does not call uploadImage",
			String(fake.uploadCalls),
		);
	} else {
		ok("unsupported path does not call uploadImage");
	}

	// Protocol still returns a typed outcome if invoked directly.
	const refused = await fake.client.uploadImage({
		file: new Blob([new Uint8Array([1])]),
		collection: "posts",
		id: "hello",
	});
	if (refused.ok || refused.code !== "unsupported_capability") {
		fail(
			"direct unsupported upload is typed unsupported_capability",
			JSON.stringify(refused),
		);
	} else {
		ok("direct unsupported upload is typed unsupported_capability");
	}

	const still = await fake.client.getEntry("posts", "hello");
	if (!still.ok || still.value.data.cover !== undefined) {
		fail(
			"unsupported upload leaves entry without asset reference",
			JSON.stringify(still),
		);
	} else {
		ok("unsupported upload leaves entry without asset reference");
	}
}

console.log("--- authoring assets capability ---");
for (const p of passed) console.log(`ok  ${p}`);
for (const f of failures) console.error(`FAIL ${f.label}: ${f.detail}`);

if (failures.length > 0) {
	process.exit(1);
}
console.log(
	`authoring assets capability check passed (${passed.length} assertion(s))`,
);
