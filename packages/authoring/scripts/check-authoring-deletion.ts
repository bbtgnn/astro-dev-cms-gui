/**
 * Authoring-application deletion capability check (issue #16).
 * Uses a fake protocol client through the public AuthoringClient seam.
 *
 * Run: bun run packages/authoring/scripts/check-authoring-deletion.ts
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
import { offersEntryDeletion } from "../src/capabilities";
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
	deleteCalls: Array<{ collection: string; id: string }>;
} {
	const store = [...opts.entries];
	const deleteCalls: Array<{ collection: string; id: string }> = [];

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
		async upsertEntry(): Promise<SaveEntryResult> {
			return cmsErr("forbidden", "not used in this check");
		},
		async deleteEntry(
			collection: string,
			id: string,
		): Promise<DeleteEntryResult> {
			deleteCalls.push({ collection, id });
			if (!opts.capabilities.deleteEntry) {
				return cmsErr(
					"unsupported_capability",
					"Entry deletion is not supported",
				);
			}
			const idx = store.findIndex(
				(e) => e.collection === collection && e.id === id,
			);
			if (idx < 0) return cmsErr("not_found", "Not found");
			store.splice(idx, 1);
			return cmsOk(null);
		},
		async uploadImage(): Promise<UploadImageResult> {
			return cmsErr("forbidden", "not used in this check");
		},
	};

	return { client, deleteCalls };
}

const sample: ContentEntry = {
	id: "hello",
	collection: "posts",
	data: { title: "Hello" },
	revision: "rev-1",
};

// --- Capability helper ---
if (offersEntryDeletion(resolveCmsCapabilities({ deleteEntry: true }))) {
	ok("offersEntryDeletion true when capability set");
} else {
	fail("offersEntryDeletion true when capability set", "expected true");
}

if (!offersEntryDeletion(resolveCmsCapabilities({ deleteEntry: false }))) {
	ok("offersEntryDeletion false when capability unset");
} else {
	fail("offersEntryDeletion false when capability unset", "expected false");
}

if (!offersEntryDeletion(null) && !offersEntryDeletion(undefined)) {
	ok("offersEntryDeletion false when capabilities unknown");
} else {
	fail(
		"offersEntryDeletion false when capabilities unknown",
		"expected false for null/undefined",
	);
}

// --- Supported: authoring would offer delete, call protocol, refresh list ---
{
	const fake = createFakeClient({
		capabilities: resolveCmsCapabilities({ deleteEntry: true }),
		entries: [sample],
	});
	const caps = await fake.client.getCapabilities();
	const offer = offersEntryDeletion(caps.value);
	if (!offer) {
		fail("supported capability offers deletion control", "canDelete=false");
	} else {
		ok("supported capability offers deletion control");
	}

	if (!offer) {
		// skip transport call — mirrors EntryEditor gating
	} else {
		const result = await fake.client.deleteEntry("posts", "hello");
		if (!result.ok) {
			fail("supported delete through client succeeds", JSON.stringify(result));
		} else {
			ok("supported delete through client succeeds");
		}
		const listed = await fake.client.listEntries("posts");
		if (listed.value.some((e) => e.id === "hello")) {
			fail(
				"supported delete refreshes visible entry list",
				JSON.stringify(listed.value),
			);
		} else {
			ok("supported delete refreshes visible entry list");
		}
		if (fake.deleteCalls.length !== 1) {
			fail(
				"supported path issues one deleteEntry call",
				String(fake.deleteCalls.length),
			);
		} else {
			ok("supported path issues one deleteEntry call");
		}
	}
}

// --- Unsupported: hide control; no deleteEntry transport call ---
{
	const fake = createFakeClient({
		capabilities: resolveCmsCapabilities({ deleteEntry: false }),
		entries: [sample],
	});
	const caps = await fake.client.getCapabilities();
	const offer = offersEntryDeletion(caps.value);
	if (offer) {
		fail("unsupported capability hides deletion control", "canDelete=true");
	} else {
		ok("unsupported capability hides deletion control");
	}

	// Authoring must not call delete when unsupported (no failing transport).
	if (fake.deleteCalls.length !== 0) {
		fail(
			"unsupported path does not call deleteEntry",
			JSON.stringify(fake.deleteCalls),
		);
	} else {
		ok("unsupported path does not call deleteEntry");
	}

	// Protocol still returns a typed outcome if invoked directly.
	const refused = await fake.client.deleteEntry("posts", "hello");
	if (refused.ok || refused.code !== "unsupported_capability") {
		fail(
			"direct unsupported delete is typed unsupported_capability",
			JSON.stringify(refused),
		);
	} else {
		ok("direct unsupported delete is typed unsupported_capability");
	}

	const still = await fake.client.getEntry("posts", "hello");
	if (!still.ok) {
		fail("unsupported delete leaves entry readable", JSON.stringify(still));
	} else {
		ok("unsupported delete leaves entry readable");
	}
}

console.log("--- authoring deletion capability ---");
for (const p of passed) console.log(`ok  ${p}`);
for (const f of failures) console.error(`FAIL ${f.label}: ${f.detail}`);

if (failures.length > 0) {
	process.exit(1);
}
console.log(
	`authoring deletion capability check passed (${passed.length} assertion(s))`,
);
