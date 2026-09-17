/**
 * PROTOTYPE / SPIKE — single /_cms/[...path] JSON dispatcher.
 * Thin Astro transport: maps CMS protocol outcomes ↔ HTTP; no domain rules.
 */
import type { CmsProtocol, ContentEntry } from "@cms/crud";
import { httpStatusForCmsErr } from "@cms/crud";
import { cmsDevOnlyGuard } from "./dev-guard";
import {
	DEFAULT_IMAGE_WIDTHS,
	DEFAULT_WEBP_QUALITY,
	processImageToWebpSizes,
} from "./process-image";

export type CmsDispatcherOptions = {
	protocol: CmsProtocol;
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
}): Response {
	return Response.json(
		{ error: result.message, code: result.code },
		{ status: httpStatusForCmsErr(result.code) },
	);
}

function parseWidths(raw: FormDataEntryValue | null): number[] | undefined {
	if (typeof raw !== "string" || !raw.trim()) return undefined;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (
			Array.isArray(parsed) &&
			parsed.every((n) => typeof n === "number" && Number.isFinite(n))
		) {
			return parsed;
		}
	} catch {
		const parts = raw.split(",").map((s) => Number(s.trim()));
		if (parts.every((n) => Number.isFinite(n) && n > 0)) return parts;
	}
	return undefined;
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
			// Pass 0 heartbeat
			if (path === "" || path === "ok") {
				return Response.json({ ok: true, mount, prototype: true });
			}

			// GET /api/collections
			if (path === "api/collections" && method === "GET") {
				const result = await protocol.listCollections();
				return Response.json(result.value);
			}

			// GET /api/assets/<rel-from-content-root>
			if (path.startsWith("api/assets/") && method === "GET") {
				const rel = path.slice("api/assets/".length);
				const asset = await protocol.readAsset(decodeURIComponent(rel));
				return new Response(Buffer.from(asset.bytes), {
					status: 200,
					headers: {
						"content-type": asset.contentType,
						"cache-control": "no-store",
					},
				});
			}

			// POST /api/images — multipart: file, collection, id, name?, widths?, quality?
			if (path === "api/images" && method === "POST") {
				const form = await request.formData();
				const file = form.get("file");
				const collection = String(form.get("collection") ?? "");
				const id = String(form.get("id") ?? "");
				const name = String(form.get("name") ?? "cover");
				if (!(file instanceof File)) {
					return Response.json(
						{ error: "file is required", code: "MISSING_FILE" },
						{ status: 400 },
					);
				}
				if (!collection || !id) {
					return Response.json(
						{
							error: "collection and id are required",
							code: "MISSING_ENTRY",
						},
						{ status: 400 },
					);
				}

				const buf = new Uint8Array(await file.arrayBuffer());
				const widths = parseWidths(form.get("widths")) ?? [
					...DEFAULT_IMAGE_WIDTHS,
				];
				const qualityRaw = form.get("quality");
				const quality =
					typeof qualityRaw === "string" && qualityRaw.trim()
						? Number(qualityRaw)
						: DEFAULT_WEBP_QUALITY;

				const processed = await processImageToWebpSizes(buf, {
					widths,
					quality: Number.isFinite(quality) ? quality : DEFAULT_WEBP_QUALITY,
				});
				const written = await protocol.writeImageAssets({
					collection,
					id,
					name,
					widths: processed.widths,
					files: processed.files.map((f) => ({
						relativeToFolder: f.relativeToFolder,
						bytes: f.bytes,
					})),
				});
				return Response.json(written);
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
					return Response.json(await protocol.upsertEntry(entry));
				}

				if (id && method === "DELETE") {
					await protocol.deleteEntry(collection, id);
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
