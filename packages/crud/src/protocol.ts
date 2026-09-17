/**
 * CMS protocol — serializable DTOs and typed outcomes (ADR-0005, ADR-0014).
 * Browser-safe: no Node / Astro / filesystem imports.
 */
import type {
	CollectionSummary,
	ContentEntry,
	UpsertEntryInput,
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
 * Serializable asset / image-upload advertisement (ADR-0005 / ADR-0008).
 * Limits are advisory for the authoring UI — no transport details.
 */
export type CmsAssetsCapability = {
	/** Whether image upload + write-back is available on this implementation. */
	uploadImage: boolean;
	/** Max source upload size in bytes. */
	maxUploadBytes: number;
	/** Default width variants when the field does not override. */
	defaultWidths: number[];
};

/**
 * Serializable optional-ops advertisement (ADR-0005 / ADR-0008).
 * No implementation or transport details.
 */
export type CmsCapabilities = {
	/** Whether content-entry deletion is available on this implementation. */
	deleteEntry: boolean;
	/** Asset upload support and relevant limits. */
	assets: CmsAssetsCapability;
};

/** Partial override for {@link resolveCmsCapabilities}. */
export type CmsCapabilitiesInput = {
	deleteEntry?: boolean;
	assets?: Partial<CmsAssetsCapability>;
};

export type GetCapabilitiesResult = CmsOk<CmsCapabilities>;

/** Delete failure codes, including capability negotiation. */
export type DeleteEntryFailureCode =
	| "not_found"
	| "forbidden"
	| "conflict"
	| "unsupported_capability";

export type DeleteEntryResult = CmsResult<null, DeleteEntryFailureCode>;

/** Image upload input — raw bytes; processing stays behind the protocol seam. */
export type UploadImageInput = {
	collection: string;
	id: string;
	/** Folder name under the entry id dir (default `cover`). */
	name?: string;
	bytes: Uint8Array;
	/** Optional original filename for diagnostics / content-type hints. */
	filename?: string;
	widths?: number[];
	quality?: number;
};

/** Upload failure codes, including capability negotiation. */
export type UploadImageFailureCode =
	| "forbidden"
	| "conflict"
	| "validation_failed"
	| "unsupported_capability"
	| "processing_failed";

export type UploadImageResult = CmsResult<
	WrittenImageAssets,
	UploadImageFailureCode
>;

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
	/**
	 * Process source bytes and write canonical WebP assets.
	 * Implementations without asset support return `unsupported_capability`.
	 */
	uploadImage(input: UploadImageInput): Promise<UploadImageResult>;
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

/** Default asset limits advertised by the filesystem / memory adapter. */
export const DEFAULT_CMS_ASSETS_CAPABILITY: CmsAssetsCapability = {
	uploadImage: true,
	maxUploadBytes: 10 * 1024 * 1024,
	defaultWidths: [480, 960, 1600],
};

/** Default capabilities when an implementation does not override. */
export const DEFAULT_CMS_CAPABILITIES: CmsCapabilities = {
	deleteEntry: true,
	assets: { ...DEFAULT_CMS_ASSETS_CAPABILITY },
};

export function resolveCmsCapabilities(
	partial?: CmsCapabilitiesInput | null,
): CmsCapabilities {
	const assetsPartial = partial?.assets;
	return {
		deleteEntry: partial?.deleteEntry ?? DEFAULT_CMS_CAPABILITIES.deleteEntry,
		assets: {
			uploadImage:
				assetsPartial?.uploadImage ?? DEFAULT_CMS_ASSETS_CAPABILITY.uploadImage,
			maxUploadBytes:
				assetsPartial?.maxUploadBytes ??
				DEFAULT_CMS_ASSETS_CAPABILITY.maxUploadBytes,
			defaultWidths: assetsPartial?.defaultWidths
				? [...assetsPartial.defaultWidths]
				: [...DEFAULT_CMS_ASSETS_CAPABILITY.defaultWidths],
		},
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
		case "processing_failed":
			return 422;
		default:
			return 400;
	}
}
