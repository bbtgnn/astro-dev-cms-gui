/**
 * Portable check: sharp convert + protocol uploadImage + entry save (issue #17).
 * Also keeps srcset / safe-read allowlist coverage via createCmsHost.
 */
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
	pathMap: {
		posts: { hello: "posts/hello.yaml" },
	},
	processImage: processImageToWebpSizes,
});
const { protocol } = host;

const created = await protocol.upsertEntry({
	id: "hello",
	collection: "posts",
	data: { title: "img check" },
	expectedRevision: null,
});
if (!created.ok) {
	throw new Error(`create failed: ${JSON.stringify(created)}`);
}

/** Minimal 1×1 PNG (red). */
const png = Uint8Array.from(
	atob(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
	),
	(c) => c.charCodeAt(0),
);

const processed = await processImageToWebpSizes(png, {
	widths: [480, 960, 1600],
	quality: 80,
});

if (processed.files.length !== 3) {
	throw new Error(`expected 3 files, got ${processed.files.length}`);
}
const names = processed.files.map((f) => f.relativeToFolder).sort();
if (
	JSON.stringify(names) !==
	JSON.stringify(["480.webp", "960.webp", "cover.webp"])
) {
	throw new Error(`unexpected names: ${names.join(",")}`);
}

// Protocol uploadImage → field path → content entry save (self-host validation).
const caps = await protocol.getCapabilities();
if (!caps.ok || !caps.value.assets.uploadImage) {
	throw new Error(`expected assets capability: ${JSON.stringify(caps)}`);
}

const uploaded = await protocol.uploadImage({
	collection: "posts",
	id: "hello",
	name: "cover",
	bytes: png,
	filename: "pixel.png",
	widths: [480, 960, 1600],
});
if (!uploaded.ok) {
	throw new Error(`uploadImage failed: ${JSON.stringify(uploaded)}`);
}
if (uploaded.value.path !== "./hello/cover/cover.webp") {
	throw new Error(`unexpected upload path: ${uploaded.value.path}`);
}

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
if (!found480) {
	throw new Error("480.webp not in memory store");
}

const items = resolveImageSrcsetItems(uploaded.value.path, [480, 960, 1600]);
const asset = contentAssetPath("posts", uploaded.value.path, "960.webp");
if (asset !== "posts/hello/cover/960.webp") {
	throw new Error(`bad asset path: ${asset}`);
}
if (items[2]?.file !== "cover.webp" || items[2]?.width !== 1600) {
	throw new Error(`bad srcset canonical: ${JSON.stringify(items)}`);
}

let denied = false;
try {
	await host.readAsset("../etc/passwd");
} catch (e) {
	denied = (e as { status?: number }).status === 400;
}
if (!denied) throw new Error("expected unsafe asset 400");

const saved = await protocol.upsertEntry({
	id: "hello",
	collection: "posts",
	data: { title: "img check", cover: uploaded.value.path },
	expectedRevision: created.value.revision,
});
if (!saved.ok) {
	throw new Error(`save after upload failed: ${JSON.stringify(saved)}`);
}
if (saved.value.data.cover !== uploaded.value.path) {
	throw new Error(`cover not persisted: ${JSON.stringify(saved.value.data)}`);
}

const reread = await protocol.getEntry("posts", "hello");
if (!reread.ok || reread.value.data.cover !== uploaded.value.path) {
	throw new Error(`reread missing cover: ${JSON.stringify(reread)}`);
}

// Failed processing must not invent a content reference.
const bad = await protocol.uploadImage({
	collection: "posts",
	id: "hello",
	name: "nope",
	bytes: new Uint8Array(0),
});
if (bad.ok) {
	throw new Error("expected empty upload to fail");
}
const still = await protocol.getEntry("posts", "hello");
if (!still.ok || still.value.data.cover !== uploaded.value.path) {
	throw new Error("failed upload must not change persisted cover");
}

console.log("ok  image convert + uploadImage + srcset helpers");
console.log("ok  protocol uploadImage + entry save");
console.log("ok  items", items.map((i) => `${i.file}@${i.width}`).join(", "));
