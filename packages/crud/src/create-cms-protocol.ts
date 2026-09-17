/**
 * Adapt WriteMode (FS / memory writer) to the CMS protocol seam.
 * Domain behavior stays in write-mode; this only shapes typed outcomes.
 */
import {
	type CmsCapabilitiesInput,
	type CmsProtocol,
	cmsErr,
	cmsOk,
	type DeleteEntryResult,
	type GetEntryResult,
	resolveCmsCapabilities,
	type SaveEntryResult,
	type UploadImageInput,
	type UploadImageResult,
} from "./protocol";
import type {
	CreateWriteModeOptions,
	UpsertEntryInput,
	WriteImageAssetsInput,
	WriteMode,
	WrittenImageAssets,
} from "./types";
import { createWriteMode } from "./write-mode";

type ErrLike = {
	status?: number;
	code?: string;
	message?: string;
	issues?: unknown;
};

/** Host-injected pixel pipeline (Sharp stays out of this package). */
export type ProcessImageToWebpSizes = (
	input: Uint8Array,
	opts?: { widths?: number[]; quality?: number },
) => Promise<{
	files: Array<{ relativeToFolder: string; bytes: Uint8Array; width: number }>;
	widths: number[];
}>;

export type AdaptProtocolOptions = {
	/** Override optional protocol capabilities (defaults: deletion + assets). */
	capabilities?: CmsCapabilitiesInput;
	/**
	 * Image processor used by {@link CmsProtocol.uploadImage}.
	 * Required when `assets.uploadImage` is true; keep Sharp in the host/routes layer.
	 */
	processImage?: ProcessImageToWebpSizes;
};

export type CreateCmsProtocolOptions = CreateWriteModeOptions &
	AdaptProtocolOptions;

type SharedFailureCode =
	| "forbidden"
	| "conflict"
	| "not_found"
	| "validation_failed"
	| "unsupported_capability";

const CONFLICT_CODES = new Set([
	"YAML_EXT_COLLISION",
	"REVISION_CONFLICT",
]);

const UPLOAD_VALIDATION_CODES = new Set([
	"VALIDATION_FAILED",
	"UNSAFE_ASSET",
	"INVALID_WIDTHS",
	"MISSING_FILE",
	"MISSING_ENTRY",
]);

/**
 * Map WriteMode throws to shared protocol failure codes.
 * Callers pass the subset they surface for that op.
 */
function mapWriteModeFailure(
	err: unknown,
	allowed: ReadonlySet<SharedFailureCode>,
	validationCodes: ReadonlySet<string> = new Set(["VALIDATION_FAILED"]),
): CmsErrLike | null {
	const e = err as ErrLike;
	if (
		allowed.has("forbidden") &&
		(e.status === 403 || e.code === "PATH_NOT_ALLOWED")
	) {
		// Stable domain message — never echo absolute filesystem paths.
		return cmsErr("forbidden", "Forbidden");
	}
	if (
		allowed.has("conflict") &&
		(e.status === 409 || (e.code != null && CONFLICT_CODES.has(e.code)))
	) {
		return cmsErr("conflict", e.message || "Conflict");
	}
	if (
		allowed.has("not_found") &&
		(e.status === 404 || e.code === "NOT_FOUND")
	) {
		return cmsErr("not_found", e.message || "Not found");
	}
	if (
		allowed.has("validation_failed") &&
		(e.status === 400 ||
			(e.code != null && validationCodes.has(e.code)))
	) {
		return cmsErr("validation_failed", e.message || "Validation failed", {
			issues: e.issues,
		});
	}
	if (
		allowed.has("unsupported_capability") &&
		(e.status === 501 || e.code === "unsupported_capability")
	) {
		return cmsErr(
			"unsupported_capability",
			e.message || "Capability is not supported",
		);
	}
	return null;
}

type CmsErrLike = {
	ok: false;
	code: SharedFailureCode;
	message: string;
	issues?: unknown;
};

const GET_CODES = new Set<SharedFailureCode>(["forbidden", "conflict"]);
const SAVE_CODES = new Set<SharedFailureCode>([
	"forbidden",
	"conflict",
	"not_found",
	"validation_failed",
]);
const DELETE_CODES = new Set<SharedFailureCode>([
	"forbidden",
	"conflict",
	"not_found",
]);
const UPLOAD_CODES = new Set<SharedFailureCode>([
	"forbidden",
	"conflict",
	"validation_failed",
	"unsupported_capability",
]);

function getEntryFailure(err: unknown): GetEntryResult | null {
	return mapWriteModeFailure(err, GET_CODES) as GetEntryResult | null;
}

function saveEntryFailure(err: unknown): SaveEntryResult | null {
	return mapWriteModeFailure(err, SAVE_CODES) as SaveEntryResult | null;
}

function deleteEntryFailure(err: unknown): DeleteEntryResult | null {
	return mapWriteModeFailure(err, DELETE_CODES) as DeleteEntryResult | null;
}

function uploadImageFailure(err: unknown): UploadImageResult | null {
	return mapWriteModeFailure(
		err,
		UPLOAD_CODES,
		UPLOAD_VALIDATION_CODES,
	) as UploadImageResult | null;
}

/** Lift an existing WriteMode behind the protocol interface. */
export function adaptWriteModeToProtocol(
	wm: WriteMode,
	options?: AdaptProtocolOptions,
): CmsProtocol {
	const capabilities = resolveCmsCapabilities(options?.capabilities);
	const processImage = options?.processImage;

	async function writeImageAssetsGuarded(
		input: WriteImageAssetsInput,
	): Promise<WrittenImageAssets> {
		if (!capabilities.assets.uploadImage) {
			throw Object.assign(new Error("Image assets are not supported"), {
				status: 501,
				code: "unsupported_capability",
			});
		}
		return wm.writeImageAssets(input);
	}

	return {
		async getCapabilities() {
			return cmsOk(capabilities);
		},

		async listCollections() {
			return cmsOk(await wm.listCollections());
		},

		async listEntries(collection: string) {
			const listed = await wm.listEntries(collection);
			return cmsOk(listed.map(({ id }) => ({ collection, id })));
		},

		async getEntry(collection: string, id: string): Promise<GetEntryResult> {
			try {
				const entry = await wm.getEntry(collection, id);
				if (!entry) {
					return cmsErr("not_found", "Not found");
				}
				return cmsOk(entry);
			} catch (err) {
				const failure = getEntryFailure(err);
				if (failure) return failure;
				throw err;
			}
		},

		async upsertEntry(input: UpsertEntryInput): Promise<SaveEntryResult> {
			try {
				return cmsOk(await wm.upsertEntry(input));
			} catch (err) {
				const failure = saveEntryFailure(err);
				if (failure) return failure;
				throw err;
			}
		},

		async deleteEntry(
			collection: string,
			id: string,
		): Promise<DeleteEntryResult> {
			if (!capabilities.deleteEntry) {
				return cmsErr(
					"unsupported_capability",
					"Entry deletion is not supported",
				);
			}
			try {
				await wm.deleteEntry(collection, id);
				return cmsOk(null);
			} catch (err) {
				const failure = deleteEntryFailure(err);
				if (failure) return failure;
				throw err;
			}
		},

		async uploadImage(input: UploadImageInput): Promise<UploadImageResult> {
			if (!capabilities.assets.uploadImage) {
				return cmsErr(
					"unsupported_capability",
					"Image upload is not supported",
				);
			}
			if (!processImage) {
				return cmsErr(
					"unsupported_capability",
					"Image processing is not configured",
				);
			}
			if (!input.collection || !input.id) {
				return cmsErr("validation_failed", "collection and id are required");
			}
			if (
				!(input.bytes instanceof Uint8Array) ||
				input.bytes.byteLength === 0
			) {
				return cmsErr("validation_failed", "file is required");
			}
			if (input.bytes.byteLength > capabilities.assets.maxUploadBytes) {
				return cmsErr(
					"validation_failed",
					`Upload exceeds max size of ${capabilities.assets.maxUploadBytes} bytes`,
				);
			}

			const widths =
				input.widths && input.widths.length > 0
					? input.widths
					: capabilities.assets.defaultWidths;

			try {
				const processed = await processImage(input.bytes, {
					widths,
					quality: input.quality,
				});
				const written = await writeImageAssetsGuarded({
					collection: input.collection,
					id: input.id,
					name: input.name,
					widths: processed.widths,
					files: processed.files.map((f) => ({
						relativeToFolder: f.relativeToFolder,
						bytes: f.bytes,
					})),
				});
				return cmsOk(written);
			} catch (err) {
				const failure = uploadImageFailure(err);
				if (failure) return failure;
				const message =
					err instanceof Error ? err.message : "Image processing failed";
				return cmsErr("processing_failed", message);
			}
		},
	};
}

/** In-memory or filesystem protocol from the same CreateWriteModeOptions. */
export function createCmsProtocol(
	options: CreateCmsProtocolOptions,
): CmsProtocol {
	const { capabilities, processImage, ...wmOptions } = options;
	return adaptWriteModeToProtocol(createWriteMode(wmOptions), {
		capabilities,
		processImage,
	});
}
