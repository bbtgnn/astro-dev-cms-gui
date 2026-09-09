/**
 * PROTOTYPE / SPIKE — thin fetch client for shell UI → /_cms API.
 */
import type { ContentEntry } from "./types.ts";

export function createFetchClient(base = "/_cms") {
  const root = base.replace(/\/+$/, "");

  async function json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${root}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${body}`);
    }
    return (await res.json()) as T;
  }

  return {
    listCollections: () => json<{ name: string }[]>("/api/collections"),
    listEntries: (collection: string) =>
      json<{ id: string }[]>(`/api/collections/${collection}`),
    getEntry: (collection: string, id: string) =>
      json<ContentEntry>(`/api/collections/${collection}/${id}`),
    upsertEntry: (entry: ContentEntry) =>
      json<ContentEntry>(`/api/collections/${entry.collection}/${entry.id}`, {
        method: "PUT",
        body: JSON.stringify(entry),
      }),
    deleteEntry: (collection: string, id: string) =>
      json<void>(`/api/collections/${collection}/${id}`, { method: "DELETE" }),
  };
}
