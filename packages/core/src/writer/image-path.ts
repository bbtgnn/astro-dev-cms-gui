/**
 * Path helpers for authored image folders (one original file per field; ADR-0015).
 * Framework-free — hosts build asset URLs from the persisted path string.
 */

export function imageFolderFromCanonical(canonicalPath: string): string {
	const cleaned = canonicalPath.replace(/^\.\//, "").replace(/\\/g, "/");
	const idx = cleaned.lastIndexOf("/");
	return idx >= 0 ? cleaned.slice(0, idx) : "";
}

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
