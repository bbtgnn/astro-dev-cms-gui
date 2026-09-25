/**
 * In-process path normalize for write-back (forward slashes after resolve).
 */
import * as pathe from "pathe";

export function normalizeFs(p: string): string {
	return pathe.resolve(p).replace(/\\/g, "/");
}
