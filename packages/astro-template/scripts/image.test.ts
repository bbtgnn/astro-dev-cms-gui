/**
 * Portable check: original-byte uploadImage + entry save (ADR-0015 / #21).
 */

import { describe, expect, test } from "bun:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCmsHost, memoryWriter } from "@cms/crud";
import { z } from "zod";
import { contentAssetPath } from "../../fields/src/resolve-image.ts";

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

describe("original asset uploadImage + safe-read", () => {
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
				config: { base: "posts", extension: "json" },
			},
		],
	});
	const { protocol } = host;

	test("protocol uploadImage stores original + entry save + safe-read", async () => {
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
		expect(
			"defaultWidths" in (caps.value.assets as Record<string, unknown>),
		).toBe(false);

		const uploaded = await protocol.uploadImage({
			collection: "posts",
			id: "hello",
			name: "cover",
			bytes: png,
			filename: "pixel.png",
		});
		expect(uploaded.ok).toBe(true);
		if (!uploaded.ok) return;
		expect(uploaded.value.path).toBe("./hello/cover/pixel.png");
		expect(uploaded.value.files).toEqual(["posts/hello/cover/pixel.png"]);

		let foundOriginal = false;
		for (const [k, v] of writer.store.entries()) {
			if (
				k.replace(/\\/g, "/").endsWith("posts/hello/cover/pixel.png") &&
				v instanceof Uint8Array
			) {
				foundOriginal = true;
				expect([...v]).toEqual([...png]);
				break;
			}
		}
		expect(foundOriginal).toBe(true);

		expect(contentAssetPath("posts", uploaded.value.path)).toBe(
			"posts/hello/cover/pixel.png",
		);

		const replaced = await protocol.uploadImage({
			collection: "posts",
			id: "hello",
			name: "cover",
			bytes: png,
			filename: "other.png",
		});
		expect(replaced.ok).toBe(true);
		if (!replaced.ok) return;
		expect(replaced.value.path).toBe("./hello/cover/other.png");

		const leftover = [...writer.store.keys()].filter((k) =>
			k.replace(/\\/g, "/").includes("posts/hello/cover/pixel.png"),
		);
		expect(leftover).toEqual([]);

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
			data: { title: "img check", cover: replaced.value.path },
			expectedRevision: created.value.revision,
		});
		expect(saved.ok).toBe(true);
		if (!saved.ok) return;
		expect(saved.value.data.cover).toBe(replaced.value.path);

		const reread = await protocol.getEntry("posts", "hello");
		expect(reread.ok).toBe(true);
		if (!reread.ok) return;
		expect(reread.value.data.cover).toBe(replaced.value.path);

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
		expect(still.value.data.cover).toBe(replaced.value.path);
	});
});
