/**
 * Write-back + CMS protocol contracts (#11–#13, #16–#17).
 * Same scenarios on memory and filesystem writers via bun:test.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { processImageToWebpSizes } from "../../routes/src/process-image.ts";
import {
	adaptWriteModeToProtocol,
	createCmsProtocol,
} from "../src/create-cms-protocol";
import { createWriteMode } from "../src/write-mode";
import {
	type BackendFixture,
	createFixture,
	discoveryMode,
	discoveryProtocol,
	expectNoFilesystemPaths,
	postsCollection,
	WRITER_BACKENDS,
	type WriterBackend,
} from "./write-back-contract-fixtures";

function forEachBackend(
	suiteName: string,
	fn: (backend: WriterBackend) => void,
): void {
	for (const backend of WRITER_BACKENDS) {
		describe(`${suiteName} (${backend})`, () => {
			fn(backend);
		});
	}
}

function useFixture(backend: WriterBackend): {
	get: () => BackendFixture;
} {
	let fixture: BackendFixture;

	beforeEach(async () => {
		fixture = await createFixture(backend);
	});

	afterEach(async () => {
		await fixture.cleanup();
	});

	return {
		get: () => fixture,
	};
}

// ---------------------------------------------------------------------------
// #11 — internal WriteMode write-back
// ---------------------------------------------------------------------------

forEachBackend("write-back contract", (backend) => {
	const fx = useFixture(backend);

	test("traversal escapes allowlist", async () => {
		const { root, writer } = fx.get();
		const wm = createWriteMode({
			root,
			allowPaths: ["posts"],
			writer,
			pathMap: {
				posts: {
					ok: "posts/ok.yaml",
					evil: "../evil.yaml",
				},
				secrets: {
					env: "../../.env",
				},
			},
		});
		await expect(
			wm.upsertEntry({
				id: "evil",
				collection: "posts",
				data: { title: "nope" },
				expectedRevision: null,
			}),
		).rejects.toMatchObject({ status: 403 });
	});

	test("path outside allowlist roots", async () => {
		const { root, writer } = fx.get();
		const wm = createWriteMode({
			root,
			allowPaths: ["posts"],
			writer,
			pathMap: {
				posts: {
					ok: "posts/ok.yaml",
					evil: "../evil.yaml",
				},
				secrets: {
					env: "../../.env",
				},
			},
		});
		await expect(
			wm.upsertEntry({
				id: "env",
				collection: "secrets",
				data: { x: 1 },
				expectedRevision: null,
			}),
		).rejects.toMatchObject({ status: 403 });
	});

	test("unsafe nested id", async () => {
		const { root, writer } = fx.get();
		const wm = createWriteMode({
			root,
			allowPaths: ["posts"],
			writer,
			pathMap: {
				posts: {
					ok: "posts/ok.yaml",
					evil: "../evil.yaml",
				},
				secrets: {
					env: "../../.env",
				},
			},
		});
		await expect(
			wm.upsertEntry({
				id: "../escape",
				collection: "posts",
				data: { title: "nope" },
				expectedRevision: null,
			}),
		).rejects.toMatchObject({ status: 400 });
	});

	test("yaml+yml collision", async () => {
		const fixture = fx.get();
		await fixture.seedFile("posts/both.yaml", "title: a\n");
		await fixture.seedFile("posts/both.yml", "title: b\n");
		const collideMode = discoveryMode(fixture.root, fixture.writer);
		await expect(collideMode.getEntry("posts", "both")).rejects.toMatchObject({
			status: 409,
		});
	});

	test("list/read/save + revision guards", async () => {
		const fixture = fx.get();
		const { root, writer } = fixture;
		const wm = discoveryMode(root, writer);

		const colls = await wm.listCollections();
		expect(colls.some((c) => c.name === "posts" && c.label === "Posts")).toBe(
			true,
		);

		const created = await wm.upsertEntry({
			id: "ok",
			collection: "posts",
			data: { title: "yes" },
			expectedRevision: null,
		});
		expect(typeof created.revision).toBe("string");
		expect(created.revision.length).toBeGreaterThan(0);

		const listed = await wm.listEntries("posts");
		expect(listed.some((e) => e.id === "ok")).toBe(true);

		const read = await wm.getEntry("posts", "ok");
		expect(read?.id).toBe("ok");
		expect(read?.collection).toBe("posts");
		expect(read?.data.title).toBe("yes");
		expect(read?.revision).toBe(created.revision);

		await expect(
			wm.upsertEntry({
				id: "ok",
				collection: "posts",
				data: { title: 1 },
				expectedRevision: created.revision,
			}),
		).rejects.toMatchObject({ status: 400 });

		const afterInvalid = await wm.getEntry("posts", "ok");
		expect(afterInvalid?.data.title).toBe("yes");
		expect(afterInvalid?.revision).toBe(created.revision);

		expect(await wm.getEntry("posts", "does-not-exist")).toBeNull();
		expect(await wm.listEntries("no-such-collection")).toEqual([]);
		expect(await wm.getEntry("no-such-collection", "x")).toBeNull();

		const updated = await wm.upsertEntry({
			id: "ok",
			collection: "posts",
			data: { title: "updated" },
			expectedRevision: created.revision,
		});
		expect(updated.data.title).toBe("updated");
		expect(updated.revision).not.toBe(created.revision);

		await expect(
			wm.upsertEntry({
				id: "ok",
				collection: "posts",
				data: { title: "stale" },
				expectedRevision: created.revision,
			}),
		).rejects.toMatchObject({ status: 409 });

		const afterStale = await wm.getEntry("posts", "ok");
		expect(afterStale?.data.title).toBe("updated");

		await expect(
			wm.upsertEntry({
				id: "ok",
				collection: "posts",
				data: { title: "again" },
				expectedRevision: null,
			}),
		).rejects.toMatchObject({ status: 409 });

		await fixture.seedFile("posts/ok.yaml", "title: external\n");
		const afterExternal = await wm.getEntry("posts", "ok");
		expect(afterExternal?.data.title).toBe("external");
		expect(afterExternal?.revision).not.toBe(updated.revision);

		await expect(
			wm.upsertEntry({
				id: "ok",
				collection: "posts",
				data: { title: "overwrite" },
				expectedRevision: updated.revision,
			}),
		).rejects.toMatchObject({ status: 409 });

		const stillExternal = await wm.getEntry("posts", "ok");
		expect(stillExternal?.data.title).toBe("external");
	});
});

// ---------------------------------------------------------------------------
// #12 — read-side CmsProtocol
// ---------------------------------------------------------------------------

forEachBackend("read-side protocol contract", (backend) => {
	const fx = useFixture(backend);

	test("list/get identities + typed failures", async () => {
		const fixture = fx.get();
		const { root, writer } = fixture;
		const protocol = discoveryProtocol(root, writer);

		const colls = await protocol.listCollections();
		expect(colls.ok).toBe(true);
		if (!colls.ok) return;
		expect(
			colls.value.some((c) => c.name === "posts" && c.label === "Posts"),
		).toBe(true);
		expectNoFilesystemPaths(colls.value);

		const created = await protocol.upsertEntry({
			id: "ok",
			collection: "posts",
			data: { title: "yes" },
			expectedRevision: null,
		});
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		expect(typeof created.value.revision).toBe("string");
		expect(created.value.revision.length).toBeGreaterThan(0);

		const listed = await protocol.listEntries("posts");
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(
			listed.value.some((e) => e.collection === "posts" && e.id === "ok"),
		).toBe(true);
		expectNoFilesystemPaths(listed.value);

		const read = await protocol.getEntry("posts", "ok");
		expect(read.ok).toBe(true);
		if (!read.ok) return;
		expect(read.value.id).toBe("ok");
		expect(read.value.collection).toBe("posts");
		expect(read.value.data.title).toBe("yes");
		expect(read.value.revision).toBe(created.value.revision);
		expectNoFilesystemPaths(read.value);

		const missing = await protocol.getEntry("posts", "does-not-exist");
		expect(missing.ok).toBe(false);
		if (missing.ok) return;
		expect(missing.code).toBe("not_found");

		const unknown = await protocol.getEntry("no-such-collection", "x");
		expect(unknown.ok).toBe(false);
		if (unknown.ok) return;
		expect(unknown.code).toBe("not_found");

		const forbiddenProtocol = adaptWriteModeToProtocol(
			createWriteMode({
				root,
				allowPaths: ["posts"],
				writer,
				pathMap: {
					posts: {
						blocked: "../blocked.yaml",
					},
				},
			}),
		);
		const forbidden = await forbiddenProtocol.getEntry("posts", "blocked");
		expect(forbidden.ok).toBe(false);
		if (forbidden.ok) return;
		expect(forbidden.code).toBe("forbidden");

		await fixture.seedFile("posts/both.yaml", "title: a\n");
		await fixture.seedFile("posts/both.yml", "title: b\n");
		const collide = await discoveryProtocol(root, writer).getEntry(
			"posts",
			"both",
		);
		expect(collide.ok).toBe(false);
		if (collide.ok) return;
		expect(collide.code).toBe("conflict");
	});
});

// ---------------------------------------------------------------------------
// #13 — write-side CmsProtocol
// ---------------------------------------------------------------------------

forEachBackend("write-side protocol contract", (backend) => {
	const fx = useFixture(backend);

	test("guarded save, validation, conflict, ADR-0010 input", async () => {
		const fixture = fx.get();
		const { root, writer } = fixture;
		const protocol = discoveryProtocol(root, writer);

		const created = await protocol.upsertEntry({
			id: "guard",
			collection: "posts",
			data: { title: "first" },
			expectedRevision: null,
		});
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const saved = await protocol.upsertEntry({
			id: "guard",
			collection: "posts",
			data: { title: "second" },
			expectedRevision: created.value.revision,
		});
		expect(saved.ok).toBe(true);
		if (!saved.ok) return;
		expect(saved.value.data.title).toBe("second");
		expect(saved.value.revision).not.toBe(created.value.revision);

		const stale = await protocol.upsertEntry({
			id: "guard",
			collection: "posts",
			data: { title: "stale" },
			expectedRevision: created.value.revision,
		});
		expect(stale.ok).toBe(false);
		if (stale.ok) return;
		expect(stale.code).toBe("conflict");

		const afterStale = await protocol.getEntry("posts", "guard");
		expect(afterStale.ok).toBe(true);
		if (!afterStale.ok) return;
		expect(afterStale.value.data.title).toBe("second");

		const invalid = await protocol.upsertEntry({
			id: "guard",
			collection: "posts",
			data: { title: 99 },
			expectedRevision: saved.value.revision,
		});
		expect(invalid.ok).toBe(false);
		if (invalid.ok) return;
		expect(invalid.code).toBe("validation_failed");
		expect(invalid.issues).toBeDefined();

		// Persist Zod input, not transformed output (ADR-0010).
		const transformSchema = z.object({
			title: z.string().transform((s) => s.toUpperCase()),
		});
		const transformProtocol = createCmsProtocol({
			root,
			allowPaths: ["posts"],
			writer,
			collections: [
				{
					name: "posts",
					label: "Posts",
					schema: transformSchema,
					base: "posts",
					config: { label: "Posts", base: "posts" },
				},
			],
		});
		const transformed = await transformProtocol.upsertEntry({
			id: "xform",
			collection: "posts",
			data: { title: "mixedCase" },
			expectedRevision: null,
		});
		const reread = await transformProtocol.getEntry("posts", "xform");
		expect(transformed.ok).toBe(true);
		expect(reread.ok).toBe(true);
		if (!transformed.ok || !reread.ok) return;
		expect(reread.value.data.title).toBe("mixedCase");

		if (backend === "filesystem") {
			const abs = path.join(root, "posts/guard.yaml");
			const raw = await readFile(abs, "utf8");
			expect(raw).toBe("title: second\n");
		}

		await fixture.seedFile("posts/guard.yaml", "title: external\n");
		const afterExternal = await protocol.getEntry("posts", "guard");
		const conflictExternal = await protocol.upsertEntry({
			id: "guard",
			collection: "posts",
			data: { title: "overwrite" },
			expectedRevision: saved.value.revision,
		});
		const stillExternal = await protocol.getEntry("posts", "guard");
		expect(afterExternal.ok).toBe(true);
		if (!afterExternal.ok) return;
		expect(afterExternal.value.data.title).toBe("external");
		expect(conflictExternal.ok).toBe(false);
		if (conflictExternal.ok) return;
		expect(conflictExternal.code).toBe("conflict");
		expect(stillExternal.ok).toBe(true);
		if (!stillExternal.ok) return;
		expect(stillExternal.value.data.title).toBe("external");
	});
});

// ---------------------------------------------------------------------------
// #16 — deletion capability
// ---------------------------------------------------------------------------

forEachBackend("deletion capability contract", (backend) => {
	const fx = useFixture(backend);

	test("supported delete + unsupported_capability variant", async () => {
		const { root, writer } = fx.get();
		const protocol = discoveryProtocol(root, writer);

		const caps = await protocol.getCapabilities();
		expect(caps.ok).toBe(true);
		if (!caps.ok) return;
		expect(caps.value.deleteEntry).toBe(true);
		expectNoFilesystemPaths(caps.value);

		const created = await protocol.upsertEntry({
			id: "to-delete",
			collection: "posts",
			data: { title: "gone" },
			expectedRevision: null,
		});
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const deleted = await protocol.deleteEntry("posts", "to-delete");
		expect(deleted.ok).toBe(true);

		const listed = await protocol.listEntries("posts");
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.value.some((e) => e.id === "to-delete")).toBe(false);

		const missing = await protocol.getEntry("posts", "to-delete");
		expect(missing.ok).toBe(false);
		if (missing.ok) return;
		expect(missing.code).toBe("not_found");

		const unsupported = createCmsProtocol({
			root,
			allowPaths: ["posts"],
			writer,
			collections: [postsCollection],
			capabilities: { deleteEntry: false },
		});
		const unsupportedCaps = await unsupported.getCapabilities();
		expect(unsupportedCaps.ok).toBe(true);
		if (!unsupportedCaps.ok) return;
		expect(unsupportedCaps.value.deleteEntry).toBe(false);

		const kept = await unsupported.upsertEntry({
			id: "keep-me",
			collection: "posts",
			data: { title: "stay" },
			expectedRevision: null,
		});
		expect(kept.ok).toBe(true);
		if (!kept.ok) return;

		const refused = await unsupported.deleteEntry("posts", "keep-me");
		expect(refused.ok).toBe(false);
		if (refused.ok) return;
		expect(refused.code).toBe("unsupported_capability");

		const stillThere = await unsupported.getEntry("posts", "keep-me");
		expect(stillThere.ok).toBe(true);
		if (!stillThere.ok) return;
		expect(stillThere.value.data.title).toBe("stay");
	});
});

// ---------------------------------------------------------------------------
// #17 — assets capability
// ---------------------------------------------------------------------------

forEachBackend("assets capability contract", (backend) => {
	const fx = useFixture(backend);

	test(
		"upload + save path, failures, unsupported variant",
		async () => {
			const { root, writer } = fx.get();
			const postsWithCover = {
				...postsCollection,
				schema: z.object({
					title: z.string(),
					cover: z.string().optional(),
				}),
			};
			const protocol = createCmsProtocol({
				root,
				allowPaths: ["posts"],
				writer,
				collections: [postsWithCover],
				processImage: processImageToWebpSizes,
			});

			const caps = await protocol.getCapabilities();
			expect(caps.ok).toBe(true);
			if (!caps.ok) return;
			expect(caps.value.assets.uploadImage).toBe(true);
			expect(typeof caps.value.assets.maxUploadBytes).toBe("number");
			expect(Array.isArray(caps.value.assets.defaultWidths)).toBe(true);
			expect(caps.value.assets.defaultWidths.length).toBeGreaterThan(0);
			expectNoFilesystemPaths(caps.value);

			const created = await protocol.upsertEntry({
				id: "img-entry",
				collection: "posts",
				data: { title: "with image" },
				expectedRevision: null,
			});
			expect(created.ok).toBe(true);
			if (!created.ok) return;

			/** Minimal 1×1 PNG. */
			const png = Uint8Array.from(
				atob(
					"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
				),
				(c) => c.charCodeAt(0),
			);

			const uploaded = await protocol.uploadImage({
				collection: "posts",
				id: "img-entry",
				name: "cover",
				bytes: png,
				filename: "pixel.png",
			});
			expect(uploaded.ok).toBe(true);
			if (!uploaded.ok) return;
			expect(uploaded.value.path).toBe("./img-entry/cover/cover.webp");

			const saved = await protocol.upsertEntry({
				id: "img-entry",
				collection: "posts",
				data: { title: "with image", cover: uploaded.value.path },
				expectedRevision: created.value.revision,
			});
			expect(saved.ok).toBe(true);
			if (!saved.ok) return;
			expect(saved.value.data.cover).toBe(uploaded.value.path);

			const reread = await protocol.getEntry("posts", "img-entry");
			expect(reread.ok).toBe(true);
			if (!reread.ok) return;
			expect(reread.value.data.cover).toBe(uploaded.value.path);

			const oversized = await protocol.uploadImage({
				collection: "posts",
				id: "img-entry",
				name: "cover",
				bytes: new Uint8Array(caps.value.assets.maxUploadBytes + 1),
				filename: "huge.bin",
			});
			expect(oversized.ok).toBe(false);
			if (oversized.ok) return;
			expect(oversized.code).toBe("validation_failed");

			const afterOversize = await protocol.getEntry("posts", "img-entry");
			expect(afterOversize.ok).toBe(true);
			if (!afterOversize.ok) return;
			expect(afterOversize.value.data.cover).toBe(uploaded.value.path);

			const empty = await protocol.uploadImage({
				collection: "posts",
				id: "img-entry",
				name: "broken",
				bytes: new Uint8Array(0),
				filename: "empty.bin",
			});
			expect(empty.ok).toBe(false);
			if (empty.ok) return;
			expect(empty.code).toBe("validation_failed");

			const unsupported = createCmsProtocol({
				root,
				allowPaths: ["posts"],
				writer,
				collections: [postsWithCover],
				capabilities: { assets: { uploadImage: false } },
				processImage: processImageToWebpSizes,
			});
			const unsupportedCaps = await unsupported.getCapabilities();
			expect(unsupportedCaps.ok).toBe(true);
			if (!unsupportedCaps.ok) return;
			expect(unsupportedCaps.value.assets.uploadImage).toBe(false);

			const refused = await unsupported.uploadImage({
				collection: "posts",
				id: "img-entry",
				name: "cover",
				bytes: png,
				filename: "pixel.png",
			});
			expect(refused.ok).toBe(false);
			if (refused.ok) return;
			expect(refused.code).toBe("unsupported_capability");
		},
		{ timeout: 30_000 },
	);
});
