/**
 * CMS protocol — serializable DTOs and typed outcomes (ADR-0005, ADR-0014).
 * Browser-safe: no Node / Astro / filesystem imports.
 */
import type {
	CollectionSummary,
	ContentEntry,
	UpsertEntryInput,
	WrittenImageAssets,
} from "../writer/types";

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
	issues?: unknown;
};

export type CmsResult<T, C extends string = string> = CmsOk<T> | CmsErr<C>;

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
	uploadImage: boolean;
	maxUploadBytes: number;
};

/**
 * Serializable optional-ops advertisement (ADR-0005 / ADR-0008).
 * No implementation or transport details.
 */
export type CmsCapabilities = {
	deleteEntry: boolean;
	assets: CmsAssetsCapability;
};

export type CmsCapabilitiesInput = {
	deleteEntry?: boolean;
	assets?: Partial<CmsAssetsCapability>;
};

export type GetCapabilitiesResult = CmsOk<CmsCapabilities>;

export type DeleteEntryFailureCode =
	| "not_found"
	| "forbidden"
	| "conflict"
	| "unsupported_capability";

export type DeleteEntryResult = CmsResult<null, DeleteEntryFailureCode>;

/** Image upload input — original bytes stored as-is (ADR-0015). */
export type UploadImageInput = {
	collection: string;
	id: string;
	name?: string;
	bytes: Uint8Array;
	/** Original filename; sanitized basename is written under the field folder. */
	filename?: string;
};

export type UploadImageFailureCode =
	| "forbidden"
	| "conflict"
	| "validation_failed"
	| "unsupported_capability";

export type UploadImageResult = CmsResult<
	WrittenImageAssets,
	UploadImageFailureCode
>;

export type CmsProtocol = {
	getCapabilities(): Promise<GetCapabilitiesResult>;
	listCollections(): Promise<ListCollectionsResult>;
	listEntries(collection: string): Promise<ListEntriesResult>;
	getEntry(collection: string, id: string): Promise<GetEntryResult>;
	upsertEntry(input: UpsertEntryInput): Promise<SaveEntryResult>;
	deleteEntry(collection: string, id: string): Promise<DeleteEntryResult>;
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

export const DEFAULT_CMS_ASSETS_CAPABILITY: CmsAssetsCapability = {
	uploadImage: true,
	maxUploadBytes: 10 * 1024 * 1024,
};

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
		},
	};
}

export const CMS_ERR_DEFAULT_MESSAGE: Record<string, string> = {
	not_found: "Not found",
	forbidden: "Forbidden",
	conflict: "Conflict",
	validation_failed: "Validation failed",
	unsupported_capability: "Capability is not supported",
};

export const GET_ENTRY_FAILURE_CODES = [
	"not_found",
	"forbidden",
	"conflict",
] as const satisfies readonly GetEntryFailureCode[];

export const SAVE_ENTRY_FAILURE_CODES = [
	"not_found",
	"forbidden",
	"conflict",
	"validation_failed",
] as const satisfies readonly SaveEntryFailureCode[];

export const DELETE_ENTRY_FAILURE_CODES = [
	"not_found",
	"forbidden",
	"conflict",
	"unsupported_capability",
] as const satisfies readonly DeleteEntryFailureCode[];

export const UPLOAD_IMAGE_FAILURE_CODES = [
	"forbidden",
	"conflict",
	"validation_failed",
	"unsupported_capability",
] as const satisfies readonly UploadImageFailureCode[];

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

export function isAllowedCmsFailureCode<C extends string>(
	code: string,
	allowed: readonly C[],
): code is C {
	return (allowed as readonly string[]).includes(code);
}

export function defaultMessageForCmsErr(code: string): string {
	return CMS_ERR_DEFAULT_MESSAGE[code] ?? "Request failed";
}

/**
 * Status→code fallback when an HTTP body omits `code`.
 * Derived from {@link httpStatusForCmsErr} so maps cannot drift from the tables.
 */
export function statusMapForCodes<C extends string>(
	allowed: readonly C[],
): Partial<Record<number, { code: C; defaultMessage: string }>> {
	const map: Partial<Record<number, { code: C; defaultMessage: string }>> = {};
	for (const code of allowed) {
		const status = httpStatusForCmsErr(code);
		map[status] = {
			code,
			defaultMessage: defaultMessageForCmsErr(code),
		};
	}
	return map;
}
