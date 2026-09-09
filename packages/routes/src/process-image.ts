/**
 * Authoring-time WebP + width generation via sharp (dev /_cms image API).
 */
import sharp from "sharp";

export const DEFAULT_IMAGE_WIDTHS = [480, 960, 1600] as const;
export const DEFAULT_WEBP_QUALITY = 80;

export type ProcessImageOptions = {
	widths?: number[];
	quality?: number;
};

export type ProcessedImageFile = {
	relativeToFolder: string;
	bytes: Uint8Array;
	width: number;
};

/**
 * Convert upload bytes → cover.webp (max width) + `{w}.webp` for smaller widths.
 * Original is not retained.
 */
export async function processImageToWebpSizes(
	input: Uint8Array,
	opts: ProcessImageOptions = {},
): Promise<{ files: ProcessedImageFile[]; widths: number[] }> {
	const widths = [...(opts.widths ?? DEFAULT_IMAGE_WIDTHS)].sort(
		(a, b) => a - b,
	);
	if (widths.length === 0) {
		throw Object.assign(new Error("widths must be non-empty"), {
			status: 400,
			code: "INVALID_WIDTHS",
		});
	}
	const quality = opts.quality ?? DEFAULT_WEBP_QUALITY;
	const maxWidth = widths.at(-1);
	if (maxWidth == null) {
		throw Object.assign(new Error("widths must be non-empty"), {
			status: 400,
			code: "INVALID_WIDTHS",
		});
	}

	const files: ProcessedImageFile[] = [];

	for (const width of widths) {
		const buf = await sharp(input)
			.rotate()
			.resize({ width, withoutEnlargement: true })
			.webp({ quality })
			.toBuffer();
		const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
		if (width === maxWidth) {
			files.push({ relativeToFolder: "cover.webp", bytes, width });
		} else {
			files.push({ relativeToFolder: `${width}.webp`, bytes, width });
		}
	}

	return { files, widths };
}
