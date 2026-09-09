/**
 * Path helpers for authored image folders (canonical cover.webp + width variants).
 * Framework-free — hosts build URLs / `<img srcset>` from the convention.
 */

export const DEFAULT_IMAGE_SRCSET_WIDTHS = [480, 960, 1600] as const;

export type ImageSrcsetItem = {
	/** Filename inside the image folder (`cover.webp` or `480.webp`). */
	file: string;
	width: number;
};

/**
 * Given YAML canonical path `./hello/cover/cover.webp` and widths,
 * return descriptors for srcset (canonical file = max width).
 */
export function resolveImageSrcsetItems(
	_canonicalPath: string,
	widths: readonly number[] = DEFAULT_IMAGE_SRCSET_WIDTHS,
): ImageSrcsetItem[] {
	const sorted = [...widths].sort((a, b) => a - b);
	const max = sorted[sorted.length - 1];
	if (max == null) return [];

	return sorted.map((width) => ({
		width,
		file: width === max ? "cover.webp" : `${width}.webp`,
	}));
}

/** Directory containing the canonical file, from a YAML-relative path. */
export function imageFolderFromCanonical(canonicalPath: string): string {
	const cleaned = canonicalPath.replace(/^\.\//, "").replace(/\\/g, "/");
	const idx = cleaned.lastIndexOf("/");
	return idx >= 0 ? cleaned.slice(0, idx) : "";
}

/**
 * Build a content-root-relative asset path for the CMS asset GET route.
 * `collectionBase` is the collection folder under content root (e.g. `posts`).
 * `canonicalPath` is the YAML-relative value (`./hello/cover/cover.webp`).
 */
export function contentAssetPath(
	collectionBase: string,
	canonicalPath: string,
	file?: string,
): string {
	const folder = imageFolderFromCanonical(canonicalPath);
	const name = file ?? canonicalPath.replace(/\\/g, "/").split("/").pop()!;
	const base = collectionBase.replace(/\/+$/, "");
	return `${base}/${folder}/${name}`.replace(/\/+/g, "/");
}

/**
 * `srcset` attribute value using an asset URL builder.
 */
export function formatSrcset(
	items: ImageSrcsetItem[],
	urlFor: (file: string, width: number) => string,
): string {
	return items
		.map((item) => `${urlFor(item.file, item.width)} ${item.width}w`)
		.join(", ");
}
