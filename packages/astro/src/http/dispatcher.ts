/**
 * Single /_cms/[...path] JSON dispatcher.
 * Thin Astro transport: maps CMS protocol outcomes ↔ HTTP; no domain rules.
 */
import type { CmsProtocol, ReadAssetResult } from "@cms/core";
import { httpStatusForCmsErr } from "@cms/core";
import { cmsDevOnlyGuard } from "./dev-guard";

export type CmsDispatcherOptions = {
	protocol: CmsProtocol;
	/**
	 * Host-side asset bytes for GET /api/assets/* (createCmsHost.readAsset).
	 * Kept off the serializable CMS protocol so paths stay in the adapter.
	 */
	readAsset?: (relFromRoot: string) => Promise<ReadAssetResult>;
	/** import.meta.env.DEV in Astro */
	isDev: boolean;
	allowInProd?: boolean;
	/** Mount prefix without trailing slash, default /_cms */
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
 * Handle a request whose pathname is under the CMS mount.
 * `path` is the rest after `/_cms/` (e.g. `api/collections/posts/hello`).
 */
export function createCmsDispatcher(options: CmsDispatcherOptions) {
	const mount = (options.mount ?? "/_cms").replace(/\/+$/, "");

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

			// GET /api/capabilities
			if (path === "api/capabilities" && method === "GET") {
				const result = await protocol.getCapabilities();
				return Response.json(result.value);
			}

			// GET /api/collections
			if (path === "api/collections" && method === "GET") {
				const result = await protocol.listCollections();
				return Response.json(result.value);
			}

			// GET /api/assets/<rel-from-content-root> — host readAsset, not protocol
			if (path.startsWith("api/assets/") && method === "GET") {
				if (!options.readAsset) {
					return Response.json(
						{ error: "Asset reads are not configured", code: "not_found" },
						{ status: 404 },
					);
				}
				const rel = path.slice("api/assets/".length);
				const asset = await options.readAsset(decodeURIComponent(rel));
				return new Response(Buffer.from(asset.bytes), {
					status: 200,
					headers: {
						"content-type": asset.contentType,
						"cache-control": "no-store",
					},
				});
			}

			// POST /api/images — multipart: file, collection, id, name?
			if (path === "api/images" && method === "POST") {
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

			// /api/collections/:collection[/:id]
			const collMatch = /^api\/collections\/([^/]+)(?:\/([^/]+))?$/.exec(path);
			if (collMatch) {
				const collection = decodeURIComponent(collMatch[1]!);
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
