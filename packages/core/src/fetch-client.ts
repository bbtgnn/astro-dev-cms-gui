/**
 * Thin protocol client for shell UI → /_cms transport.
 * Browser-safe: import from `@cms/core/fetch-client` (not package root —
 * root re-exports Node FS writers).
 */
import type {
	CmsCapabilities,
	CmsErr,
	CmsProtocol,
	CollectionSummary,
	ContentEntry,
	DeleteEntryResult,
	EntryIdentity,
	GetCapabilitiesResult,
	GetEntryResult,
	SaveEntryResult,
	UploadImageResult,
	UpsertEntryInput,
} from "./protocol";
import {
	DELETE_ENTRY_FAILURE_CODES,
	defaultMessageForCmsErr,
	GET_ENTRY_FAILURE_CODES,
	httpStatusForCmsErr,
	isAllowedCmsFailureCode,
	legacyStatusMapForCodes,
	SAVE_ENTRY_FAILURE_CODES,
	UPLOAD_IMAGE_FAILURE_CODES,
} from "./protocol";
import type { WrittenImageAssets } from "./types";

export type {
	CmsAssetsCapability,
	CmsCapabilities,
	CmsCapabilitiesInput,
	CmsErr,
	CmsOk,
	CmsProtocol,
	CmsResult,
	CollectionSummary,
	ContentEntry,
	DeleteEntryFailureCode,
	DeleteEntryResult,
	EntryIdentity,
	GetCapabilitiesResult,
	GetEntryFailureCode,
	GetEntryResult,
	ListCollectionsResult,
	ListEntriesResult,
	SaveEntryFailureCode,
	SaveEntryResult,
	UploadImageFailureCode,
	UploadImageInput,
	UploadImageResult,
	UpsertEntryInput,
} from "./protocol";
export {
	CMS_ERR_DEFAULT_MESSAGE,
	cmsErr,
	cmsOk,
	DEFAULT_CMS_ASSETS_CAPABILITY,
	DEFAULT_CMS_CAPABILITIES,
	DELETE_ENTRY_FAILURE_CODES,
	defaultMessageForCmsErr,
	GET_ENTRY_FAILURE_CODES,
	httpStatusForCmsErr,
	isAllowedCmsFailureCode,
	legacyStatusMapForCodes,
	resolveCmsCapabilities,
	SAVE_ENTRY_FAILURE_CODES,
	UPLOAD_IMAGE_FAILURE_CODES,
} from "./protocol";
export type { WrittenImageAssets } from "./types";

/** Thrown when the CMS JSON API returns a non-OK status outside typed outcomes. */
export class CmsFetchError extends Error {
	readonly status: number;
	readonly code?: string;
	readonly issues?: unknown;
	readonly bodyText: string;

	constructor(
		status: number,
		statusText: string,
		bodyText: string,
		parsed?: { error?: string; code?: string; issues?: unknown },
	) {
		super(
			parsed?.error
				? `${status} ${statusText}: ${parsed.error}`
				: `${status} ${statusText}: ${bodyText}`,
		);
		this.name = "CmsFetchError";
		this.status = status;
		this.code = parsed?.code;
		this.issues = parsed?.issues;
		this.bodyText = bodyText;
	}
}

export function isCmsFetchError(err: unknown): err is CmsFetchError {
	return err instanceof CmsFetchError;
}

type ErrorBody = { error?: string; code?: string; issues?: unknown };

type LegacyStatusMap<C extends string> = Partial<
	Record<number, { code: C; defaultMessage?: string }>
>;

async function parseErrorBody(
	bodyText: string,
): Promise<ErrorBody | undefined> {
	try {
		return JSON.parse(bodyText) as ErrorBody;
	} catch {
		return undefined;
	}
}

/**
 * Map a non-OK CMS response to a typed failure outcome, or throw CmsFetchError.
 * Prefers an explicit protocol `code` when it is allowed and status-aligned;
 * otherwise applies the op's derived status→code map from protocol tables.
 */
async function outcomeFromResponse<C extends string>(
	res: Response,
	allowedCodes: readonly C[],
	legacyByStatus: LegacyStatusMap<C>,
	options?: { includeIssues?: boolean },
): Promise<CmsErr<C>> {
	const bodyText = await res.text();
	const parsed = await parseErrorBody(bodyText);
	const code = parsed?.code;
	const includeIssues = options?.includeIssues === true;

	if (
		code !== undefined &&
		isAllowedCmsFailureCode(code, allowedCodes) &&
		res.status === httpStatusForCmsErr(code)
	) {
		return {
			ok: false,
			code,
			message: parsed?.error ?? (bodyText || res.statusText),
			...(includeIssues && parsed?.issues !== undefined
				? { issues: parsed.issues }
				: {}),
		};
	}

	const legacy = legacyByStatus[res.status];
	if (legacy) {
		return {
			ok: false,
			code: legacy.code,
			message:
				parsed?.error ??
				legacy.defaultMessage ??
				defaultMessageForCmsErr(legacy.code),
			...(legacy.code === "validation_failed" && parsed?.issues !== undefined
				? { issues: parsed.issues }
				: {}),
		};
	}

	throw new CmsFetchError(res.status, res.statusText, bodyText, parsed);
}

export type CmsFetchClient = Omit<CmsProtocol, "uploadImage"> & {
	/**
	 * Multipart image upload over the HTTP transport.
	 * Browser FormData shape; server protocol uses bytes.
	 */
	uploadImage(input: {
		file: Blob;
		collection: string;
		id: string;
		name?: string;
		filename?: string;
	}): Promise<UploadImageResult>;
};

/**
 * Browser protocol client — same read/write surface as CmsProtocol, over HTTP.
 * Typed read/save/delete failures are outcomes; other transport failures throw CmsFetchError.
 */
export function createFetchClient(base = "/_cms"): CmsFetchClient {
	const root = base.replace(/\/+$/, "");

	async function request(path: string, init?: RequestInit): Promise<Response> {
		return fetch(`${root}${path}`, {
			...init,
			headers: {
				accept: "application/json",
				...(init?.body ? { "content-type": "application/json" } : {}),
				...init?.headers,
			},
		});
	}

	async function throwIfNotOk(res: Response): Promise<void> {
		if (res.ok) return;
		const bodyText = await res.text();
		const parsed = await parseErrorBody(bodyText);
		throw new CmsFetchError(res.status, res.statusText, bodyText, parsed);
	}

	async function jsonOk<T>(path: string, init?: RequestInit): Promise<T> {
		const res = await request(path, init);
		await throwIfNotOk(res);
		if (res.status === 204) return undefined as T;
		return (await res.json()) as T;
	}

	return {
		async getCapabilities(): Promise<GetCapabilitiesResult> {
			const value = await jsonOk<CmsCapabilities>("/api/capabilities");
			return { ok: true, value };
		},

		async listCollections() {
			const value = await jsonOk<CollectionSummary[]>("/api/collections");
			return { ok: true, value };
		},

		async listEntries(collection: string) {
			const listed = await jsonOk<Array<{ id: string } | EntryIdentity>>(
				`/api/collections/${encodeURIComponent(collection)}`,
			);
			const value: EntryIdentity[] = listed.map((row) =>
				"collection" in row && typeof row.collection === "string"
					? { collection: row.collection, id: row.id }
					: { collection, id: row.id },
			);
			return { ok: true, value };
		},

		async getEntry(collection: string, id: string): Promise<GetEntryResult> {
			const res = await request(
				`/api/collections/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
			);
			if (res.ok) {
				return { ok: true, value: (await res.json()) as ContentEntry };
			}
			return outcomeFromResponse(
				res,
				GET_ENTRY_FAILURE_CODES,
				legacyStatusMapForCodes(GET_ENTRY_FAILURE_CODES),
			);
		},

		async upsertEntry(input: UpsertEntryInput): Promise<SaveEntryResult> {
			const res = await request(
				`/api/collections/${encodeURIComponent(input.collection)}/${encodeURIComponent(input.id)}`,
				{
					method: "PUT",
					body: JSON.stringify({
						id: input.id,
						collection: input.collection,
						data: input.data,
						expectedRevision: input.expectedRevision,
					}),
				},
			);
			if (res.ok) {
				return { ok: true, value: (await res.json()) as ContentEntry };
			}
			return outcomeFromResponse(
				res,
				SAVE_ENTRY_FAILURE_CODES,
				legacyStatusMapForCodes(SAVE_ENTRY_FAILURE_CODES),
				{ includeIssues: true },
			);
		},

		async deleteEntry(
			collection: string,
			id: string,
		): Promise<DeleteEntryResult> {
			const res = await request(
				`/api/collections/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
				{ method: "DELETE" },
			);
			if (res.ok || res.status === 204) {
				return { ok: true, value: null };
			}
			return outcomeFromResponse(
				res,
				DELETE_ENTRY_FAILURE_CODES,
				legacyStatusMapForCodes(DELETE_ENTRY_FAILURE_CODES),
			);
		},

		uploadImage: async (input): Promise<UploadImageResult> => {
			const body = new FormData();
			body.append("file", input.file, input.filename ?? "upload.bin");
			body.append("collection", input.collection);
			body.append("id", input.id);
			if (input.name) body.append("name", input.name);

			const res = await fetch(`${root}/api/images`, {
				method: "POST",
				headers: { accept: "application/json" },
				body,
			});
			if (res.ok) {
				return {
					ok: true,
					value: (await res.json()) as WrittenImageAssets,
				};
			}
			return outcomeFromResponse(
				res,
				UPLOAD_IMAGE_FAILURE_CODES,
				legacyStatusMapForCodes(UPLOAD_IMAGE_FAILURE_CODES),
				{ includeIssues: true },
			);
		},
	};
}
