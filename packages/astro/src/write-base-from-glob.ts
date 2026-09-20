/**
 * Map IR glob loader bases onto write-mode collection folders.
 *
 * Glob `base` is project-relative for Astro (`./src/content/posts`).
 * Write-mode bases are relative to `contentRoot` (`posts`).
 */

export function writeBaseFromGlob(
	loaderBase: string,
	collectionId: string,
): string {
	const normalized = loaderBase.replace(/\\/g, "/").replace(/\/+$/, "");
	const last = normalized.split("/").filter(Boolean).pop();
	if (last && last !== "." && last !== "..") return last;
	return collectionId;
}
