/**
 * Adapt WriteMode (FS / memory writer) to the CMS protocol seam.
 * Domain behavior stays in write-mode; this only shapes typed outcomes.
 */
import {
	type CmsProtocol,
	cmsErr,
	cmsOk,
	type GetEntryResult,
} from "./protocol";
import type { CreateWriteModeOptions, WriteMode } from "./types";
import { createWriteMode } from "./write-mode";

type ErrLike = {
	status?: number;
	code?: string;
	message?: string;
};

function getEntryFailure(err: unknown): GetEntryResult | null {
	const e = err as ErrLike;
	if (e.status === 403 || e.code === "PATH_NOT_ALLOWED") {
		// Stable domain message — never echo absolute filesystem paths.
		return cmsErr("forbidden", "Forbidden");
	}
	if (e.status === 409 || e.code === "YAML_EXT_COLLISION") {
		return cmsErr("conflict", "Conflict");
	}
	return null;
}

/** Lift an existing WriteMode behind the protocol interface. */
export function adaptWriteModeToProtocol(wm: WriteMode): CmsProtocol {
	return {
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

		upsertEntry: (entry) => wm.upsertEntry(entry),
		deleteEntry: (collection, id) => wm.deleteEntry(collection, id),
		writeImageAssets: (input) => wm.writeImageAssets(input),
		readAsset: (rel) => wm.readAsset(rel),
	};
}

/** In-memory or filesystem protocol from the same CreateWriteModeOptions. */
export function createCmsProtocol(
	options: CreateWriteModeOptions,
): CmsProtocol {
	return adaptWriteModeToProtocol(createWriteMode(options));
}
