/**
 * Opaque content-entry revisions (ADR-0014).
 * Derived from canonical serialized bytes — never a filesystem path or mtime.
 * Web Crypto (isomorphic); not `node:crypto`.
 */
export async function opaqueRevision(raw: string): Promise<string> {
	const bytes = new TextEncoder().encode(raw);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
