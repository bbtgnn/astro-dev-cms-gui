/**
 * PROTOTYPE / SPIKE — thin fetch client for shell UI → /_cms API.
 * Browser-safe: import from `@cms/crud/fetch-client` (not package root —
 * root re-exports Node FS writers).
 */
import type { ContentEntry } from "./types";

export type { ContentEntry };

/** Thrown when the CMS JSON API returns a non-OK status. */
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

export function createFetchClient(base = "/_cms") {
	const root = base.replace(/\/+$/, "");

	async function request(path: string, init?: RequestInit): Promise<Response> {
		const res = await fetch(`${root}${path}`, {
			...init,
			headers: {
				accept: "application/json",
				...(init?.body ? { "content-type": "application/json" } : {}),
				...init?.headers,
			},
		});
		if (!res.ok) {
			const bodyText = await res.text();
			let parsed:
				| { error?: string; code?: string; issues?: unknown }
				| undefined;
			try {
				parsed = JSON.parse(bodyText) as {
					error?: string;
					code?: string;
					issues?: unknown;
				};
			} catch {
				parsed = undefined;
			}
			throw new CmsFetchError(res.status, res.statusText, bodyText, parsed);
		}
		return res;
	}

	async function json<T>(path: string, init?: RequestInit): Promise<T> {
		const res = await request(path, init);
		if (res.status === 204) return undefined as T;
		return (await res.json()) as T;
	}

	return {
		listCollections: () => json<{ name: string }[]>("/api/collections"),
		listEntries: (collection: string) =>
			json<{ id: string }[]>(
				`/api/collections/${encodeURIComponent(collection)}`,
			),
		getEntry: (collection: string, id: string) =>
			json<ContentEntry>(
				`/api/collections/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
			),
		upsertEntry: (entry: ContentEntry) =>
			json<ContentEntry>(
				`/api/collections/${encodeURIComponent(entry.collection)}/${encodeURIComponent(entry.id)}`,
				{
					method: "PUT",
					body: JSON.stringify({
						id: entry.id,
						collection: entry.collection,
						data: entry.data,
					}),
				},
			),
		deleteEntry: async (collection: string, id: string) => {
			await request(
				`/api/collections/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
				{ method: "DELETE" },
			);
		},
	};
}
