/**
 * PROTOTYPE / SPIKE — thin protocol client for shell UI → /_cms transport.
 * Browser-safe: import from `@cms/crud/fetch-client` (not package root —
 * root re-exports Node FS writers).
 */
import type {
	CmsCapabilities,
	CmsErr,
	CmsProtocol,
	CollectionSummary,
	ContentEntry,
	DeleteEntryFailureCode,
	DeleteEntryResult,
	EntryIdentity,
	GetCapabilitiesResult,
	GetEntryFailureCode,
	GetEntryResult,
	SaveEntryFailureCode,
	SaveEntryResult,
	UploadImageFailureCode,
	UploadImageResult,
	UpsertEntryInput,
} from "./protocol";
import { httpStatusForCmsErr } from "./protocol";
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
	cmsErr,
	cmsOk,
	DEFAULT_CMS_ASSETS_CAPABILITY,
	DEFAULT_CMS_CAPABILITIES,
	httpStatusForCmsErr,
	resolveCmsCapabilities,
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

async function parseErrorBody(
	bodyText: string,
): Promise<ErrorBody | undefined> {
	try {
		return JSON.parse(bodyText) as ErrorBody;
	} catch {
		return undefined;
	}
}

function isGetEntryFailureCode(
	code: string | undefined,
): code is GetEntryFailureCode {
	return code === "not_found" || code === "forbidden" || code === "conflict";
}

function isSaveEntryFailureCode(
	code: string | undefined,
): code is SaveEntryFailureCode {
	return (
		code === "not_found" ||
		code === "forbidden" ||
		code === "conflict" ||
		code === "validation_failed"
	);
}

function isDeleteEntryFailureCode(
	code: string | undefined,
): code is DeleteEntryFailureCode {
	return (
		code === "not_found" ||
		code === "forbidden" ||
		code === "conflict" ||
		code === "unsupported_capability"
	);
}

function isUploadImageFailureCode(
	code: string | undefined,
): code is UploadImageFailureCode {
	return (
		code === "forbidden" ||
		code === "conflict" ||
		code === "validation_failed" ||
		code === "unsupported_capability" ||
		code === "processing_failed"
	);
}

export type CmsFetchClient = Omit<CmsProtocol, "uploadImage"> & {
	/**
	 * Multipart image upload over the HTTP transport.
	 * Prefer this over `writeImageAssets` in the browser; returns typed outcomes.
	 */
	uploadImage(input: {
		file: Blob;
		collection: string;
		id: string;
		name?: string;
		widths?: number[];
		quality?: number;
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
			const bodyText = await res.text();
			const parsed = await parseErrorBody(bodyText);
			const code = parsed?.code;
			if (
				isGetEntryFailureCode(code) &&
				res.status === httpStatusForCmsErr(code)
			) {
				return {
					ok: false,
					code,
					message: parsed?.error ?? (bodyText || res.statusText),
				} satisfies CmsErr<GetEntryFailureCode>;
			}
			// Legacy transport: 404/403/409 without a protocol code.
			if (res.status === 404) {
				return {
					ok: false,
					code: "not_found",
					message: parsed?.error ?? "Not found",
				};
			}
			if (res.status === 403) {
				return {
					ok: false,
					code: "forbidden",
					message: parsed?.error ?? "Forbidden",
				};
			}
			if (res.status === 409) {
				return {
					ok: false,
					code: "conflict",
					message: parsed?.error ?? "Conflict",
				};
			}
			throw new CmsFetchError(res.status, res.statusText, bodyText, parsed);
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
			const bodyText = await res.text();
			const parsed = await parseErrorBody(bodyText);
			const code = parsed?.code;
			if (
				isSaveEntryFailureCode(code) &&
				res.status === httpStatusForCmsErr(code)
			) {
				return {
					ok: false,
					code,
					message: parsed?.error ?? (bodyText || res.statusText),
					...(parsed?.issues !== undefined ? { issues: parsed.issues } : {}),
				} satisfies CmsErr<SaveEntryFailureCode>;
			}
			// Legacy transport mapping when code is absent.
			if (res.status === 404) {
				return {
					ok: false,
					code: "not_found",
					message: parsed?.error ?? "Not found",
				};
			}
			if (res.status === 403) {
				return {
					ok: false,
					code: "forbidden",
					message: parsed?.error ?? "Forbidden",
				};
			}
			if (res.status === 409) {
				return {
					ok: false,
					code: "conflict",
					message: parsed?.error ?? "Conflict",
				};
			}
			if (res.status === 400) {
				return {
					ok: false,
					code: "validation_failed",
					message: parsed?.error ?? "Validation failed",
					...(parsed?.issues !== undefined ? { issues: parsed.issues } : {}),
				};
			}
			throw new CmsFetchError(res.status, res.statusText, bodyText, parsed);
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
			const bodyText = await res.text();
			const parsed = await parseErrorBody(bodyText);
			const code = parsed?.code;
			if (
				isDeleteEntryFailureCode(code) &&
				res.status === httpStatusForCmsErr(code)
			) {
				return {
					ok: false,
					code,
					message: parsed?.error ?? (bodyText || res.statusText),
				} satisfies CmsErr<DeleteEntryFailureCode>;
			}
			if (res.status === 404) {
				return {
					ok: false,
					code: "not_found",
					message: parsed?.error ?? "Not found",
				};
			}
			if (res.status === 403) {
				return {
					ok: false,
					code: "forbidden",
					message: parsed?.error ?? "Forbidden",
				};
			}
			if (res.status === 409) {
				return {
					ok: false,
					code: "conflict",
					message: parsed?.error ?? "Conflict",
				};
			}
			if (res.status === 501) {
				return {
					ok: false,
					code: "unsupported_capability",
					message: parsed?.error ?? "Entry deletion is not supported",
				};
			}
			throw new CmsFetchError(res.status, res.statusText, bodyText, parsed);
		},

		writeImageAssets: async () => {
			throw new Error(
				"writeImageAssets is not available on the browser protocol client; use uploadImage",
			);
		},

		readAsset: async () => {
			throw new Error(
				"readAsset is not available on the browser protocol client",
			);
		},

		uploadImage: async (input): Promise<UploadImageResult> => {
			const body = new FormData();
			body.append("file", input.file, input.filename ?? "upload.bin");
			body.append("collection", input.collection);
			body.append("id", input.id);
			if (input.name) body.append("name", input.name);
			if (input.widths) body.append("widths", JSON.stringify(input.widths));
			if (input.quality != null) body.append("quality", String(input.quality));

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
			const bodyText = await res.text();
			const parsed = await parseErrorBody(bodyText);
			const code = parsed?.code;
			if (
				isUploadImageFailureCode(code) &&
				res.status === httpStatusForCmsErr(code)
			) {
				return {
					ok: false,
					code,
					message: parsed?.error ?? (bodyText || res.statusText),
					...(parsed?.issues !== undefined ? { issues: parsed.issues } : {}),
				} satisfies CmsErr<UploadImageFailureCode>;
			}
			if (res.status === 403) {
				return {
					ok: false,
					code: "forbidden",
					message: parsed?.error ?? "Forbidden",
				};
			}
			if (res.status === 409) {
				return {
					ok: false,
					code: "conflict",
					message: parsed?.error ?? "Conflict",
				};
			}
			if (res.status === 400) {
				return {
					ok: false,
					code: "validation_failed",
					message: parsed?.error ?? "Validation failed",
					...(parsed?.issues !== undefined ? { issues: parsed.issues } : {}),
				};
			}
			if (res.status === 501) {
				return {
					ok: false,
					code: "unsupported_capability",
					message: parsed?.error ?? "Image upload is not supported",
				};
			}
			if (res.status === 422 || res.status === 500) {
				return {
					ok: false,
					code: "processing_failed",
					message: parsed?.error ?? (bodyText || res.statusText),
				};
			}
			throw new CmsFetchError(res.status, res.statusText, bodyText, parsed);
		},
	};
}
