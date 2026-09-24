/**
 * Protocol ↔ HTTP dispatcher (framework-agnostic).
 * Maps CMS protocol outcomes ↔ HTTP; no domain rules.
 *
 * Default mount `/cms/api` — paths after the mount are
 * `collections`, `capabilities`, `assets/…`, `images`, `ok`
 * (no nested `/api` segment; that lived under the old `/_cms` prefix).
 */
import type { CmsProtocol } from "../protocol";
import { httpStatusForCmsErr } from "../protocol";
import type { ReadAssetResult } from "../types";
import { cmsDevOnlyGuard } from "./dev-guard";

/** Default protocol HTTP mount (shell stays at `/cms`). */
export const DEFAULT_CMS_API_MOUNT = "/cms/api";

export type CmsDispatcherOptions = {
	protocol: CmsProtocol;
	/**
	 * Host-side asset bytes for GET …/assets/* (createCmsHost.readAsset).
	 * Kept off the serializable CMS protocol so paths stay in the adapter.
	 */
	readAsset?: (relFromRoot: string) => Promise<ReadAssetResult>;
	/** import.meta.env.DEV / Kit `dev` / equivalent */
	isDev: boolean;
	allowInProd?: boolean;
	/** Mount prefix without trailing slash, default {@link DEFAULT_CMS_API_MOUNT} */
	mount?: string;
};

type ErrLike = Error & { status?: number; issues?: unknown; code?: string };

function errorResponse(err: unknown): Response {
	const e = err as ErrLike;
	const status = typeof e.status === "number" ? e.status : 500;
	return Response.json(
		{
			error: e.message ?? "Internal error",
			code: e.code,
			issues: e.issues,
		},
		{ status },
	);
}

/** Translate a typed protocol failure into HTTP without inventing domain codes. */
function protocolErrResponse(result: {
	ok: false;
	code: string;
	message: string;
	issues?: unknown;
}): Response {
	return Response.json(
		{
			error: result.message,
			code: result.code,
			...(result.issues !== undefined ? { issues: result.issues } : {}),
		},
		{ status: httpStatusForCmsErr(result.code) },
	);
}

/**
 * Handle a request whose pathname is under the CMS API mount.
 * `pathSegments` is the rest after the mount (e.g. `collections/posts/hello`).
 */
export function createCmsDispatcher(options: CmsDispatcherOptions) {
	const mount =
		(options.mount ?? DEFAULT_CMS_API_MOUNT).replace(/\/+$/, "") ||
		DEFAULT_CMS_API_MOUNT;

	return async function handleCms(
		request: Request,
		pathSegments: string[],
	): Promise<Response> {
		const blocked = cmsDevOnlyGuard({
			isDev: options.isDev,
			allowInProd: options.allowInProd,
		});
		if (blocked) return blocked;

		const path = pathSegments.filter(Boolean).join("/");
		const method = request.method.toUpperCase();
		const protocol = options.protocol;

		try {
			// Heartbeat
			if (path === "" || path === "ok") {
				return Response.json({ ok: true, mount });
			}

			// GET /capabilities
			if (path === "capabilities" && method === "GET") {
				const result = await protocol.getCapabilities();
				return Response.json(result.value);
			}

			// GET /collections
			if (path === "collections" && method === "GET") {
				const result = await protocol.listCollections();
				return Response.json(result.value);
			}

			// GET /assets/<rel-from-content-root> — host readAsset, not protocol
			if (path.startsWith("assets/") && method === "GET") {
				if (!options.readAsset) {
					return Response.json(
						{ error: "Asset reads are not configured", code: "not_found" },
						{ status: 404 },
					);
				}
				const rel = path.slice("assets/".length);
				const asset = await options.readAsset(decodeURIComponent(rel));
				const body = asset.bytes.buffer.slice(
					asset.bytes.byteOffset,
					asset.bytes.byteOffset + asset.bytes.byteLength,
				) as ArrayBuffer;
				return new Response(body, {
					status: 200,
					headers: {
						"content-type": asset.contentType,
						"cache-control": "no-store",
					},
				});
			}

			// POST /images — multipart: file, collection, id, name?
			if (path === "images" && method === "POST") {
				const form = await request.formData();
				const file = form.get("file");
				const collection = String(form.get("collection") ?? "");
				const id = String(form.get("id") ?? "");
				const name = String(form.get("name") ?? "cover");
				if (!(file instanceof File)) {
					return Response.json(
						{ error: "file is required", code: "validation_failed" },
						{ status: 400 },
					);
				}
				if (!collection || !id) {
					return Response.json(
						{
							error: "collection and id are required",
							code: "validation_failed",
						},
						{ status: 400 },
					);
				}

				const buf = new Uint8Array(await file.arrayBuffer());

				const result = await protocol.uploadImage({
					collection,
					id,
					name,
					bytes: buf,
					filename: file.name,
				});
				if (!result.ok) return protocolErrResponse(result);
				return Response.json(result.value);
			}

			// /collections/:collection[/:id]
			const collMatch = /^collections\/([^/]+)(?:\/([^/]+))?$/.exec(path);
			if (collMatch) {
				const rawCollection = collMatch[1];
				if (rawCollection === undefined) {
					return new Response("Not Found", { status: 404 });
				}
				const collection = decodeURIComponent(rawCollection);
				const id = collMatch[2] ? decodeURIComponent(collMatch[2]) : undefined;

				if (!id && method === "GET") {
					const result = await protocol.listEntries(collection);
					// Transport keeps the prior `{ id }[]` JSON shape for shell compat.
					return Response.json(
						result.value.map(({ id: entryId }) => ({ id: entryId })),
					);
				}

				if (id && method === "GET") {
					const result = await protocol.getEntry(collection, id);
					if (!result.ok) return protocolErrResponse(result);
					return Response.json(result.value);
				}

				if (id && method === "PUT") {
					const body = (await request.json()) as {
						id?: string;
						collection?: string;
						data?: Record<string, unknown>;
						expectedRevision?: string | null;
					};
					const result = await protocol.upsertEntry({
						id: body.id ?? id,
						collection: body.collection ?? collection,
						data: (body.data ?? body) as Record<string, unknown>,
						expectedRevision:
							body.expectedRevision === undefined
								? null
								: body.expectedRevision,
					});
					if (!result.ok) return protocolErrResponse(result);
					return Response.json(result.value);
				}

				if (id && method === "DELETE") {
					const result = await protocol.deleteEntry(collection, id);
					if (!result.ok) return protocolErrResponse(result);
					return new Response(null, { status: 204 });
				}
			}

			return Response.json(
				{ error: "Not found", path, method },
				{ status: 404 },
			);
		} catch (err) {
			return errorResponse(err);
		}
	};
}
