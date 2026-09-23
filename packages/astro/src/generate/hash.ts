/**
 * Source-hash helpers for generated `content.config.ts` stale detection.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** Marker embedded in generated source (spike / ADR-0019). */
export const HASH_MARKER = "@cms-source-hash:";

/**
 * Stable SHA-256 over ordered schema-partition source files.
 * Path bytes are mixed in so identical contents at different paths differ.
 */
export function sha256OfFiles(paths: readonly string[]): string {
	const hash = createHash("sha256");
	for (const path of paths) {
		hash.update(path);
		hash.update("\0");
		hash.update(readFileSync(path));
		hash.update("\0");
	}
	return hash.digest("hex");
}

/** Extract the embedded 64-hex source hash, or null if missing/malformed. */
export function extractEmbeddedHash(source: string): string | null {
	const match = source.match(new RegExp(`${HASH_MARKER}\\s*([a-f0-9]{64})`));
	return match?.[1] ?? null;
}
