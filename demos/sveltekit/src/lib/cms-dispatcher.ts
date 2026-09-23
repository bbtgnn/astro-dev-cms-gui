/**
 * Thin protocol ↔ HTTP dispatcher (adapted from @cms/astro http/dispatcher).
 * Kept in-demo so this host does not depend on @cms/astro.
 */
import type { CmsProtocol, ReadAssetResult } from "@cms/core";
import { httpStatusForCmsErr } from "@cms/core";

export type CmsDispatcherOptions = {
	protocol: CmsProtocol;
	readAsset?: (relFromRoot: string) => Promise<ReadAssetResult>;
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

function cmsDevOnlyGuard(opts: {
	isDev: boolean;
	allowInProd?: boolean;
}): Response | null {
	if (opts.isDev || opts.allowInProd) return null;
	return Response.json(
		{ error: "CMS write-back is dev-only by default" },
		{ status: 403 },
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
			if (path === "" || path === "ok") {
				return Response.json({ ok: true, mount });
			}

			if (path === "api/capabilities" && method === "GET") {
				const result = await protocol.getCapabilities();
				return Response.json(result.value);
			}

			if (path === "api/collections" && method === "GET") {
				const result = await protocol.listCollections();
				return Response.json(result.value);
			}

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

			const collMatch = /^api\/collections\/([^/]+)(?:\/([^/]+))?$/.exec(path);
			if (collMatch) {
				const rawCollection = collMatch[1];
				if (rawCollection === undefined) {
					return new Response("Not Found", { status: 404 });
				}
				const collection = decodeURIComponent(rawCollection);
				const id = collMatch[2]
					? decodeURIComponent(collMatch[2])
					: undefined;

				if (!id && method === "GET") {
					const result = await protocol.listEntries(collection);
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
