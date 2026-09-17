/**
 * CMS protocol — serializable DTOs and typed read outcomes (ADR-0005).
 * Browser-safe: no Node / Astro / filesystem imports.
 */
import type {
	CollectionSummary,
	ContentEntry,
	ReadAssetResult,
	WriteImageAssetsInput,
	WrittenImageAssets,
} from "./types";

export type { CollectionSummary, ContentEntry };

/** Opaque content-entry identity — never a filesystem path. */
export type EntryIdentity = {
	collection: string;
	id: string;
};

export type CmsOk<T> = {
	ok: true;
	value: T;
};

export type CmsErr<C extends string = string> = {
	ok: false;
	code: C;
	message: string;
};

export type CmsResult<T, C extends string = string> = CmsOk<T> | CmsErr<C>;

/** Read-side failure codes (writable conflict revision lands in #13). */
export type GetEntryFailureCode = "not_found" | "forbidden" | "conflict";

export type GetEntryResult = CmsResult<ContentEntry, GetEntryFailureCode>;

export type ListCollectionsResult = CmsOk<CollectionSummary[]>;

export type ListEntriesResult = CmsOk<EntryIdentity[]>;

/**
 * Principal external seam for the authoring shell.
 * Read ops return typed outcomes; write ops still throw until #13.
 */
export type CmsProtocol = {
	listCollections(): Promise<ListCollectionsResult>;
	listEntries(collection: string): Promise<ListEntriesResult>;
	getEntry(collection: string, id: string): Promise<GetEntryResult>;
	upsertEntry(entry: ContentEntry): Promise<ContentEntry>;
	deleteEntry(collection: string, id: string): Promise<void>;
	writeImageAssets(input: WriteImageAssetsInput): Promise<WrittenImageAssets>;
	readAsset(relFromRoot: string): Promise<ReadAssetResult>;
};

export function cmsOk<T>(value: T): CmsOk<T> {
	return { ok: true, value };
}

export function cmsErr<C extends string>(code: C, message: string): CmsErr<C> {
	return { ok: false, code, message };
}

/** Map protocol failure codes to HTTP status for thin transports. */
export function httpStatusForCmsErr(code: string): number {
	switch (code) {
		case "not_found":
			return 404;
		case "forbidden":
			return 403;
		case "conflict":
			return 409;
		default:
			return 400;
	}
}
