/**
 * Configurable fake AuthoringClient for authoring contract tests.
 * Scenario-specific behavior stays in options — not one opaque mega-fake.
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
} from "@cms/core/fetch-client";
import type { AuthoringClient } from "../src/types";

export type FakeClientOptions = {
	/** Defaults to `resolveCmsCapabilities({ deleteEntry: true })`. */
	capabilities?: CmsCapabilities;
	entries: ContentEntry[];
	/** When set, next matching upsert returns conflict and leaves store unchanged. */
	conflictOnRevision?: string;
};

export type FakeClient = {
	client: AuthoringClient;
	store: ContentEntry[];
	deleteCalls: Array<{ collection: string; id: string }>;
	upsertCalls: Array<{
		data: Record<string, unknown>;
		expectedRevision: string | null;
	}>;
	uploadCalls: number;
};

export function createFakeClient(opts: FakeClientOptions): FakeClient {
	const capabilities =
		opts.capabilities ?? resolveCmsCapabilities({ deleteEntry: true });
	const store = [...opts.entries];
	const deleteCalls: Array<{ collection: string; id: string }> = [];
	const upsertCalls: Array<{
		data: Record<string, unknown>;
		expectedRevision: string | null;
	}> = [];
	let revCounter = 1;
	const tracking = { uploadCalls: 0 };

	const client: AuthoringClient = {
		async getCapabilities(): Promise<GetCapabilitiesResult> {
			return cmsOk(capabilities);
		},
		async listCollections(): Promise<ListCollectionsResult> {
			return cmsOk([{ name: "posts", label: "Posts" }]);
		},
		async listEntries(collection: string): Promise<ListEntriesResult> {
			return cmsOk(
				store
					.filter((e) => e.collection === collection)
					.map((e) => ({ collection: e.collection, id: e.id })),
			);
		},
		async getEntry(collection: string, id: string) {
			const hit = store.find((e) => e.collection === collection && e.id === id);
			if (!hit) return cmsErr("not_found", "Not found");
			return cmsOk(hit);
		},
		async upsertEntry(input): Promise<SaveEntryResult> {
			upsertCalls.push({
				data: input.data,
				expectedRevision: input.expectedRevision,
			});
			if (
				opts.conflictOnRevision != null &&
				input.expectedRevision === opts.conflictOnRevision
			) {
				return cmsErr("conflict", "Revision conflict");
			}
			const idx = store.findIndex(
				(e) => e.collection === input.collection && e.id === input.id,
			);
			revCounter += 1;
			const next: ContentEntry = {
				id: input.id,
				collection: input.collection,
				data: input.data,
				revision: `rev-${revCounter}`,
			};
			if (idx >= 0) store[idx] = next;
			else store.push(next);
			return cmsOk(next);
		},
		async deleteEntry(
			collection: string,
			id: string,
		): Promise<DeleteEntryResult> {
			deleteCalls.push({ collection, id });
			if (!capabilities.deleteEntry) {
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
		async uploadImage(input): Promise<UploadImageResult> {
			tracking.uploadCalls += 1;
			if (!capabilities.assets.uploadImage) {
				return cmsErr(
					"unsupported_capability",
					"Image upload is not supported",
				);
			}
			return cmsOk({
				path: `./${input.id}/cover/${input.filename ?? "upload.bin"}`,
				files: [`posts/${input.id}/cover/${input.filename ?? "upload.bin"}`],
			});
		},
	};

	return {
		client,
		store,
		deleteCalls,
		upsertCalls,
		get uploadCalls() {
			return tracking.uploadCalls;
		},
	};
}
