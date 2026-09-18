/**
 * Portable check: sharp convert + protocol uploadImage + entry save (issue #17).
 * Also keeps srcset / safe-read allowlist coverage via createCmsHost.
 */

import { describe, expect, test } from "bun:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCmsHost, memoryWriter } from "@cms/crud";
import { z } from "zod";
import {
	contentAssetPath,
	resolveImageSrcsetItems,
} from "../../fields/src/resolve-image.ts";
import { processImageToWebpSizes } from "../../routes/src/process-image.ts";

const root = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../content-sandbox-image-check",
);

const postsSchema = z.object({
	title: z.string(),
	cover: z.string().optional(),
});

/** Minimal 1×1 PNG (red). */
const png = Uint8Array.from(
	atob(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
	),
	(c) => c.charCodeAt(0),
);

describe("image convert + uploadImage + srcset helpers", () => {
	const writer = memoryWriter();
	const host = createCmsHost({
		root,
		allowPaths: ["posts"],
		writer,
		collections: [
			{
				name: "posts",
				base: "posts",
				schema: postsSchema,
				config: { base: "posts", extension: "yaml" },
			},
		],
		processImage: processImageToWebpSizes,
	});
	const { protocol } = host;

	test("sharp emits cover + width variants", async () => {
		const processed = await processImageToWebpSizes(png, {
			widths: [480, 960, 1600],
			quality: 80,
		});
		expect(processed.files).toHaveLength(3);
		const names = processed.files.map((f) => f.relativeToFolder).sort();
		expect(names).toEqual(["480.webp", "960.webp", "cover.webp"]);
	});

	test("protocol uploadImage + entry save + srcset + safe-read", async () => {
		const created = await protocol.upsertEntry({
			id: "hello",
			collection: "posts",
			data: { title: "img check" },
			expectedRevision: null,
		});
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const caps = await protocol.getCapabilities();
		expect(caps.ok).toBe(true);
		if (!caps.ok) return;
		expect(caps.value.assets.uploadImage).toBe(true);

		const uploaded = await protocol.uploadImage({
			collection: "posts",
			id: "hello",
			name: "cover",
			bytes: png,
			filename: "pixel.png",
			widths: [480, 960, 1600],
		});
		expect(uploaded.ok).toBe(true);
		if (!uploaded.ok) return;
		expect(uploaded.value.path).toBe("./hello/cover/cover.webp");

		let found480 = false;
		for (const [k, v] of writer.store.entries()) {
			if (
				k.replace(/\\/g, "/").endsWith("posts/hello/cover/480.webp") &&
				v instanceof Uint8Array
			) {
				found480 = true;
				break;
			}
		}
		expect(found480).toBe(true);

		const items = resolveImageSrcsetItems(
			uploaded.value.path,
			[480, 960, 1600],
		);
		expect(contentAssetPath("posts", uploaded.value.path, "960.webp")).toBe(
			"posts/hello/cover/960.webp",
		);
		expect(items[2]?.file).toBe("cover.webp");
		expect(items[2]?.width).toBe(1600);

		let denied = false;
		try {
			await host.readAsset("../etc/passwd");
		} catch (e) {
			denied = (e as { status?: number }).status === 400;
		}
		expect(denied).toBe(true);

		const saved = await protocol.upsertEntry({
			id: "hello",
			collection: "posts",
			data: { title: "img check", cover: uploaded.value.path },
			expectedRevision: created.value.revision,
		});
		expect(saved.ok).toBe(true);
		if (!saved.ok) return;
		expect(saved.value.data.cover).toBe(uploaded.value.path);

		const reread = await protocol.getEntry("posts", "hello");
		expect(reread.ok).toBe(true);
		if (!reread.ok) return;
		expect(reread.value.data.cover).toBe(uploaded.value.path);

		const bad = await protocol.uploadImage({
			collection: "posts",
			id: "hello",
			name: "nope",
			bytes: new Uint8Array(0),
		});
		expect(bad.ok).toBe(false);

		const still = await protocol.getEntry("posts", "hello");
		expect(still.ok).toBe(true);
		if (!still.ok) return;
		expect(still.value.data.cover).toBe(uploaded.value.path);
	});
});
