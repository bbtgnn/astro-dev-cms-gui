/**
 * CMS protocol — serializable DTOs and typed outcomes (ADR-0005, ADR-0014).
 * Browser-safe: no Node / Astro / filesystem imports.
 */
import type {
	CollectionSummary,
	ContentEntry,
	ReadAssetResult,
	UpsertEntryInput,
	WriteImageAssetsInput,
	WrittenImageAssets,
} from "./types";

export type { CollectionSummary, ContentEntry, UpsertEntryInput };

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
	/** Present for authoritative validation failures. */
	issues?: unknown;
};

export type CmsResult<T, C extends string = string> = CmsOk<T> | CmsErr<C>;

/** Read-side failure codes. */
export type GetEntryFailureCode = "not_found" | "forbidden" | "conflict";

export type GetEntryResult = CmsResult<ContentEntry, GetEntryFailureCode>;

export type ListCollectionsResult = CmsOk<CollectionSummary[]>;

export type ListEntriesResult = CmsOk<EntryIdentity[]>;

/** Guarded save failure codes (ADR-0014). */
export type SaveEntryFailureCode =
	| "not_found"
	| "forbidden"
	| "conflict"
	| "validation_failed";

export type SaveEntryResult = CmsResult<ContentEntry, SaveEntryFailureCode>;

/**
 * Serializable optional-ops advertisement (ADR-0005 / ADR-0008).
 * Booleans only — no implementation or transport details.
 */
export type CmsCapabilities = {
	/** Whether content-entry deletion is available on this implementation. */
	deleteEntry: boolean;
};

export type GetCapabilitiesResult = CmsOk<CmsCapabilities>;

/** Delete failure codes, including capability negotiation. */
export type DeleteEntryFailureCode =
	| "not_found"
	| "forbidden"
	| "conflict"
	| "unsupported_capability";

export type DeleteEntryResult = CmsResult<null, DeleteEntryFailureCode>;

/**
 * Principal external seam for the authoring shell.
 * Read and guarded-save ops return typed outcomes.
 */
export type CmsProtocol = {
	getCapabilities(): Promise<GetCapabilitiesResult>;
	listCollections(): Promise<ListCollectionsResult>;
	listEntries(collection: string): Promise<ListEntriesResult>;
	getEntry(collection: string, id: string): Promise<GetEntryResult>;
	upsertEntry(input: UpsertEntryInput): Promise<SaveEntryResult>;
	deleteEntry(collection: string, id: string): Promise<DeleteEntryResult>;
	writeImageAssets(input: WriteImageAssetsInput): Promise<WrittenImageAssets>;
	readAsset(relFromRoot: string): Promise<ReadAssetResult>;
};

export function cmsOk<T>(value: T): CmsOk<T> {
	return { ok: true, value };
}

export function cmsErr<C extends string>(
	code: C,
	message: string,
	extra?: { issues?: unknown },
): CmsErr<C> {
	return {
		ok: false,
		code,
		message,
		...(extra?.issues !== undefined ? { issues: extra.issues } : {}),
	};
}

/** Default capabilities when an implementation does not override. */
export const DEFAULT_CMS_CAPABILITIES: CmsCapabilities = {
	deleteEntry: true,
};

export function resolveCmsCapabilities(
	partial?: Partial<CmsCapabilities> | null,
): CmsCapabilities {
	return {
		deleteEntry: partial?.deleteEntry ?? DEFAULT_CMS_CAPABILITIES.deleteEntry,
	};
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
		case "validation_failed":
			return 400;
		case "unsupported_capability":
			return 501;
		default:
			return 400;
	}
}
