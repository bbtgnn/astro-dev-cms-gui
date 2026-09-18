/**
 * Path helpers for authored image folders (one original file per field; ADR-0015).
 * Framework-free — hosts build asset URLs from the persisted path string.
 */

/** Directory containing the file, from an entry-relative path. */
export function imageFolderFromCanonical(canonicalPath: string): string {
	const cleaned = canonicalPath.replace(/^\.\//, "").replace(/\\/g, "/");
	const idx = cleaned.lastIndexOf("/");
	return idx >= 0 ? cleaned.slice(0, idx) : "";
}

/**
 * Build a content-root-relative asset path for the CMS asset GET route.
 * `collectionBase` is the collection folder under content root (e.g. `posts`).
 * `canonicalPath` is the entry-relative value (`./hello/cover/photo.jpg`).
 * Optional `file` overrides the basename from `canonicalPath`.
 */
export function contentAssetPath(
	collectionBase: string,
	canonicalPath: string,
	file?: string,
): string {
	const folder = imageFolderFromCanonical(canonicalPath);
	const fromPath = canonicalPath.replace(/\\/g, "/").split("/").pop();
	const name = file ?? fromPath ?? "upload.bin";
	const base = collectionBase.replace(/\/+$/, "");
	return `${base}/${folder}/${name}`.replace(/\/+/g, "/");
}
