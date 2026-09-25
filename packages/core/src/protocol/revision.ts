/**
 * Opaque content-entry revisions (ADR-0014).
 * Derived from canonical serialized bytes — never a filesystem path or mtime.
 */
import { createHash } from "node:crypto";

export function opaqueRevision(raw: string): string {
	return createHash("sha256").update(raw, "utf8").digest("hex");
}
