/**
 * Adapt WriteMode (FS / memory writer) to the CMS protocol seam.
 * Domain behavior stays in write-mode; this only shapes typed outcomes.
 */
import {
	type CmsCapabilities,
	type CmsProtocol,
	cmsErr,
	cmsOk,
	type DeleteEntryResult,
	type GetEntryResult,
	resolveCmsCapabilities,
	type SaveEntryResult,
} from "./protocol";
import type {
	CreateWriteModeOptions,
	UpsertEntryInput,
	WriteMode,
} from "./types";
import { createWriteMode } from "./write-mode";

type ErrLike = {
	status?: number;
	code?: string;
	message?: string;
	issues?: unknown;
};

export type AdaptProtocolOptions = {
	/** Override optional protocol capabilities (defaults: deletion supported). */
	capabilities?: Partial<CmsCapabilities>;
};

export type CreateCmsProtocolOptions = CreateWriteModeOptions &
	AdaptProtocolOptions;

function getEntryFailure(err: unknown): GetEntryResult | null {
	const e = err as ErrLike;
	if (e.status === 403 || e.code === "PATH_NOT_ALLOWED") {
		// Stable domain message — never echo absolute filesystem paths.
		return cmsErr("forbidden", "Forbidden");
	}
	if (
		e.status === 409 ||
		e.code === "YAML_EXT_COLLISION" ||
		e.code === "REVISION_CONFLICT"
	) {
		return cmsErr("conflict", e.message || "Conflict");
	}
	return null;
}

function saveEntryFailure(err: unknown): SaveEntryResult | null {
	const e = err as ErrLike;
	if (e.status === 403 || e.code === "PATH_NOT_ALLOWED") {
		return cmsErr("forbidden", "Forbidden");
	}
	if (
		e.status === 409 ||
		e.code === "YAML_EXT_COLLISION" ||
		e.code === "REVISION_CONFLICT"
	) {
		return cmsErr("conflict", e.message || "Conflict");
	}
	if (e.status === 404 || e.code === "NOT_FOUND") {
		return cmsErr("not_found", e.message || "Not found");
	}
	if (e.status === 400 || e.code === "VALIDATION_FAILED") {
		return cmsErr("validation_failed", e.message || "Validation failed", {
			issues: e.issues,
		});
	}
	return null;
}

function deleteEntryFailure(err: unknown): DeleteEntryResult | null {
	const e = err as ErrLike;
	if (e.status === 403 || e.code === "PATH_NOT_ALLOWED") {
		return cmsErr("forbidden", "Forbidden");
	}
	if (
		e.status === 409 ||
		e.code === "YAML_EXT_COLLISION" ||
		e.code === "REVISION_CONFLICT"
	) {
		return cmsErr("conflict", e.message || "Conflict");
	}
	if (e.status === 404 || e.code === "NOT_FOUND") {
		return cmsErr("not_found", e.message || "Not found");
	}
	return null;
}

/** Lift an existing WriteMode behind the protocol interface. */
export function adaptWriteModeToProtocol(
	wm: WriteMode,
	options?: AdaptProtocolOptions,
): CmsProtocol {
	const capabilities = resolveCmsCapabilities(options?.capabilities);

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

		writeImageAssets: (input) => wm.writeImageAssets(input),
		readAsset: (rel) => wm.readAsset(rel),
	};
}

/** In-memory or filesystem protocol from the same CreateWriteModeOptions. */
export function createCmsProtocol(
	options: CreateCmsProtocolOptions,
): CmsProtocol {
	const { capabilities, ...wmOptions } = options;
	return adaptWriteModeToProtocol(createWriteMode(wmOptions), {
		capabilities,
	});
}
