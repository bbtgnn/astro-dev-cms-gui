/**
 * PROTOTYPE / SPIKE — single /_cms/[...path] JSON dispatcher.
 */
import type { ContentEntry, WriteMode } from "@cms/crud";
import { cmsDevOnlyGuard } from "./dev-guard.ts";

export type CmsDispatcherOptions = {
	writeMode: WriteMode;
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
		const wm = options.writeMode;

		try {
			// Pass 0 heartbeat
			if (path === "" || path === "ok") {
				return Response.json({ ok: true, mount, prototype: true });
			}

			// GET /api/collections
			if (path === "api/collections" && method === "GET") {
				return Response.json(await wm.listCollections());
			}

			// /api/collections/:collection[/:id]
			const collMatch = /^api\/collections\/([^/]+)(?:\/([^/]+))?$/.exec(path);
			if (collMatch) {
				const collection = decodeURIComponent(collMatch[1]!);
				const id = collMatch[2] ? decodeURIComponent(collMatch[2]) : undefined;

				if (!id && method === "GET") {
					return Response.json(await wm.listEntries(collection));
				}

				if (id && method === "GET") {
					const entry = await wm.getEntry(collection, id);
					if (!entry) {
						return Response.json({ error: "Not found" }, { status: 404 });
					}
					return Response.json(entry);
				}

				if (id && method === "PUT") {
					const body = (await request.json()) as Partial<ContentEntry>;
					const entry: ContentEntry = {
						id,
						collection,
						data: (body.data ?? body) as Record<string, unknown>,
					};
					// Prefer explicit payload shape when provided
					if (body.id && body.collection && body.data) {
						entry.id = body.id;
						entry.collection = body.collection;
						entry.data = body.data;
					}
					return Response.json(await wm.upsertEntry(entry));
				}

				if (id && method === "DELETE") {
					await wm.deleteEntry(collection, id);
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
