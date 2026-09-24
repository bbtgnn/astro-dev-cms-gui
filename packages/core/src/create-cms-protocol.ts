/**
 * Filesystem / memory write-back behind the CMS protocol seam (ADR-0005).
 * WriteMode stays private implementation; hosts construct via createCmsProtocol
 * or createCmsHost (protocol + host-only readAsset).
 */
import {
	type CmsCapabilitiesInput,
	type CmsProtocol,
	cmsErr,
	cmsOk,
	type DeleteEntryFailureCode,
	type DeleteEntryResult,
	defaultMessageForCmsErr,
	type GetEntryFailureCode,
	type GetEntryResult,
	resolveCmsCapabilities,
	SAVE_ENTRY_FAILURE_CODES,
	type SaveEntryFailureCode,
	type SaveEntryResult,
	type UploadImageFailureCode,
	type UploadImageInput,
	type UploadImageResult,
} from "./protocol";
import type {
	CreateCmsHostOptions,
	ReadAssetResult,
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

export type AdaptProtocolOptions = {
	/** Override optional protocol capabilities (defaults: deletion + assets). */
	capabilities?: CmsCapabilitiesInput;
};

export type CreateCmsProtocolOptions = CreateCmsHostOptions &
	AdaptProtocolOptions;

/** Re-export host construction options (no pathMap / fakeCatalog). */
export type { CreateCmsHostOptions };

/** WriteMode throw codes that surface as protocol `conflict`. */
const CONFLICT_IMPL_CODES = new Set(["REVISION_CONFLICT"]);

/** WriteMode throw codes that surface as protocol `validation_failed` on upload. */
const UPLOAD_VALIDATION_IMPL_CODES = new Set([
	"VALIDATION_FAILED",
	"UNSAFE_ASSET",
	"MISSING_FILE",
	"MISSING_ENTRY",
]);

function allows<C extends string>(allowed: ReadonlySet<C>, code: C): boolean {
	return allowed.has(code);
}

/**
 * Map WriteMode throws to protocol failure codes.
 * Allowed sets are subsets of the op tables in protocol.ts.
 */
function mapWriteModeFailure<C extends string>(
	err: unknown,
	allowed: ReadonlySet<C>,
	validationImplCodes: ReadonlySet<string> = new Set(["VALIDATION_FAILED"]),
): { ok: false; code: C; message: string; issues?: unknown } | null {
	const e = err as ErrLike;
	if (
		allows(allowed, "forbidden" as C) &&
		(e.status === 403 || e.code === "PATH_NOT_ALLOWED")
	) {
		// Stable domain message — never echo absolute filesystem paths.
		return cmsErr("forbidden" as C, defaultMessageForCmsErr("forbidden"));
	}
	if (
		allows(allowed, "conflict" as C) &&
		(e.status === 409 || (e.code != null && CONFLICT_IMPL_CODES.has(e.code)))
	) {
		return cmsErr(
			"conflict" as C,
			e.message || defaultMessageForCmsErr("conflict"),
		);
	}
	if (
		allows(allowed, "not_found" as C) &&
		(e.status === 404 || e.code === "NOT_FOUND")
	) {
		return cmsErr(
			"not_found" as C,
			e.message || defaultMessageForCmsErr("not_found"),
		);
	}
	if (
		allows(allowed, "validation_failed" as C) &&
		(e.status === 400 || (e.code != null && validationImplCodes.has(e.code)))
	) {
		return cmsErr(
			"validation_failed" as C,
			e.message || defaultMessageForCmsErr("validation_failed"),
			{ issues: e.issues },
		);
	}
	if (
		allows(allowed, "unsupported_capability" as C) &&
		(e.status === 501 || e.code === "unsupported_capability")
	) {
		return cmsErr(
			"unsupported_capability" as C,
			e.message || defaultMessageForCmsErr("unsupported_capability"),
		);
	}
	return null;
}

/** Throws mapped for getEntry (not_found is returned when the entry is null). */
const GET_THROW_CODES = new Set<GetEntryFailureCode>(["forbidden", "conflict"]);
const SAVE_THROW_CODES = new Set<SaveEntryFailureCode>(
	SAVE_ENTRY_FAILURE_CODES,
);
const DELETE_THROW_CODES = new Set<DeleteEntryFailureCode>([
	"forbidden",
	"conflict",
	"not_found",
]);
const UPLOAD_THROW_CODES = new Set<UploadImageFailureCode>([
	"forbidden",
	"conflict",
	"validation_failed",
	"unsupported_capability",
]);

function getEntryFailure(err: unknown): GetEntryResult | null {
	return mapWriteModeFailure(err, GET_THROW_CODES);
}

function saveEntryFailure(err: unknown): SaveEntryResult | null {
	return mapWriteModeFailure(err, SAVE_THROW_CODES);
}

function deleteEntryFailure(err: unknown): DeleteEntryResult | null {
	return mapWriteModeFailure(err, DELETE_THROW_CODES);
}

function uploadImageFailure(err: unknown): UploadImageResult | null {
	return mapWriteModeFailure(
		err,
		UPLOAD_THROW_CODES,
		UPLOAD_VALIDATION_IMPL_CODES,
	);
}

/** Lift private WriteMode behind the protocol interface (also used by contract harness). */
export function adaptWriteModeToProtocol(
	wm: WriteMode,
	options?: AdaptProtocolOptions,
): CmsProtocol {
	const capabilities = resolveCmsCapabilities(options?.capabilities);

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
					return cmsErr("not_found", defaultMessageForCmsErr("not_found"));
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

			try {
				const written = await writeImageAssetsGuarded({
					collection: input.collection,
					id: input.id,
					name: input.name,
					filename: input.filename ?? "upload.bin",
					bytes: input.bytes,
				});
				return cmsOk(written);
			} catch (err) {
				const failure = uploadImageFailure(err);
				if (failure) return failure;
				const message =
					err instanceof Error
						? err.message
						: defaultMessageForCmsErr("validation_failed");
				return cmsErr("validation_failed", message);
			}
		},
	};
}

/** Host transport needs: protocol ops + allowlisted asset GET (not on CmsProtocol). */
export type CmsHost = {
	protocol: CmsProtocol;
	readAsset: (relFromRoot: string) => Promise<ReadAssetResult>;
};

/**
 * Construct filesystem/memory write-back for an Astro (or other) host transport.
 * Prefer this when the dispatcher needs GET …/assets/*.
 */
export function createCmsHost(options: CreateCmsProtocolOptions): CmsHost {
	const { capabilities, ...wmOptions } = options;
	const writeMode = createWriteMode(wmOptions);
	return {
		protocol: adaptWriteModeToProtocol(writeMode, { capabilities }),
		readAsset: (rel) => writeMode.readAsset(rel),
	};
}

/** In-memory or filesystem CmsProtocol (same options as {@link createCmsHost}). */
export function createCmsProtocol(
	options: CreateCmsProtocolOptions,
): CmsProtocol {
	return createCmsHost(options).protocol;
}
