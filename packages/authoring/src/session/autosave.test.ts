/**
 * Authoring autosave orchestration (issue #19).
 * Debounce, coalesce, client-invalid skip, revision chaining, stale ignore,
 * conflict visibility — via fake protocol client + injectable timers.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createCmsHost } from "../../../core/src/protocol/create-cms-protocol.ts";
import { nodeFsWriter } from "../../../core/src/writer/node-fs-writer.ts";
import {
	createFakeTimers,
	sampleEntry,
	waitUntil,
} from "../testing/authoring-test-fixtures";
import { createFakeClient } from "../testing/fake-client";
import { type AuthoringStatus, createAutosaveController } from "./autosave";

describe("authoring autosave", () => {
	test("client-invalid never writes", async () => {
		const fake = createFakeClient({ entries: [sampleEntry] });
		const clock = createFakeTimers();
		let status: AuthoringStatus = "idle";
		let revision: string | null = "rev-1";

		const ctrl = createAutosaveController({
			debounceMs: 100,
			timers: clock.timers,
			isClientValid: (data) =>
				typeof data.title === "string" && data.title.length > 0,
			save: async (data) => {
				const result = await fake.client.upsertEntry({
					id: "hello",
					collection: "posts",
					data,
					expectedRevision: revision,
				});
				if (!result.ok) {
					return {
						ok: false,
						code: result.code,
						message: result.message,
						issues: result.issues,
					};
				}
				return { ok: true, entry: result.value };
			},
			onStatus: (s) => {
				status = s;
			},
			onSaved: (entry) => {
				revision = entry.revision;
			},
		});

		ctrl.handleChange({ title: "" });
		clock.advance(200);
		expect(status).toBe("client_invalid");
		expect(fake.upsertCalls).toHaveLength(0);
		ctrl.dispose();
	});

	test("debounce + coalesce: rapid edits → one write with latest", async () => {
		const fake = createFakeClient({ entries: [sampleEntry] });
		const clock = createFakeTimers();
		let status: AuthoringStatus = "idle";
		let revision: string | null = "rev-1";

		const ctrl = createAutosaveController({
			debounceMs: 100,
			timers: clock.timers,
			isClientValid: () => true,
			save: async (data) => {
				const result = await fake.client.upsertEntry({
					id: "hello",
					collection: "posts",
					data,
					expectedRevision: revision,
				});
				if (!result.ok) {
					return {
						ok: false,
						code: result.code,
						message: result.message,
					};
				}
				return { ok: true, entry: result.value };
			},
			onStatus: (s) => {
				status = s;
			},
			onSaved: (entry) => {
				revision = entry.revision;
			},
		});

		ctrl.handleChange({ title: "A" });
		expect(status).not.toBe("saved");
		clock.advance(50);
		ctrl.handleChange({ title: "B" });
		clock.advance(50);
		ctrl.handleChange({ title: "C" });
		expect(status).not.toBe("saved");
		clock.advance(100);
		await waitUntil(
			() => !ctrl.isInFlight() && status === "saved",
			"debounce settle",
		);

		expect(fake.upsertCalls).toHaveLength(1);
		expect(fake.upsertCalls[0]?.data.title).toBe("C");
		expect(status).toBe("saved");
		expect(revision).toBe("rev-2");
		ctrl.dispose();
	});

	test("in-flight coalesce: queue latest; chain revision", async () => {
		const fake = createFakeClient({ entries: [sampleEntry] });
		const clock = createFakeTimers();
		let revision: string | null = "rev-1";
		const gates: Array<() => void> = [];

		const ctrl = createAutosaveController({
			debounceMs: 10,
			timers: clock.timers,
			isClientValid: () => true,
			save: async (data) => {
				await new Promise<void>((resolve) => {
					gates.push(resolve);
				});
				const result = await fake.client.upsertEntry({
					id: "hello",
					collection: "posts",
					data,
					expectedRevision: revision,
				});
				if (!result.ok) {
					return {
						ok: false,
						code: result.code,
						message: result.message,
					};
				}
				return { ok: true, entry: result.value };
			},
			onStatus: () => {},
			onSaved: (entry) => {
				revision = entry.revision;
			},
		});

		ctrl.handleChange({ title: "first" });
		clock.advance(10);
		await waitUntil(
			() => ctrl.isInFlight() && gates.length >= 1,
			"first in-flight",
		);
		expect(ctrl.isInFlight()).toBe(true);

		ctrl.handleChange({ title: "second" });
		ctrl.handleChange({ title: "third" });
		gates.shift()?.();
		await waitUntil(
			() => fake.upsertCalls.length >= 1 && gates.length >= 1,
			"second write gated",
		);
		gates.shift()?.();
		await waitUntil(
			() => !ctrl.isInFlight() && fake.upsertCalls.length === 2,
			"both writes done",
		);

		expect(fake.upsertCalls).toHaveLength(2);
		expect(fake.upsertCalls[0]?.data.title).toBe("first");
		expect(fake.upsertCalls[1]?.data.title).toBe("third");
		expect(fake.upsertCalls[1]?.expectedRevision).toBe("rev-2");
		ctrl.dispose();
	});

	test("stale response does not overwrite newer revision from a later save", async () => {
		const fake = createFakeClient({ entries: [sampleEntry] });
		const clock = createFakeTimers();
		let revision: string | null = "rev-1";
		const gates: Array<() => void> = [];
		let status: AuthoringStatus = "idle";

		const ctrl = createAutosaveController({
			debounceMs: 10,
			timers: clock.timers,
			isClientValid: () => true,
			save: async (data) => {
				await new Promise<void>((resolve) => {
					gates.push(resolve);
				});
				const result = await fake.client.upsertEntry({
					id: "hello",
					collection: "posts",
					data,
					expectedRevision: revision,
				});
				if (!result.ok) {
					return {
						ok: false,
						code: result.code,
						message: result.message,
					};
				}
				return { ok: true, entry: result.value };
			},
			onStatus: (s) => {
				status = s;
			},
			onSaved: (entry) => {
				revision = entry.revision;
			},
		});

		ctrl.handleChange({ title: "one" });
		clock.advance(10);
		await waitUntil(() => gates.length >= 1, "gate one");
		ctrl.handleChange({ title: "two" });
		gates.shift()?.();
		await waitUntil(() => gates.length >= 1, "gate two");
		gates.shift()?.();
		await waitUntil(
			() => !ctrl.isInFlight() && status === "saved",
			"stale chain settle",
		);

		expect(revision).toBe("rev-3");
		expect(status).toBe("saved");
		ctrl.dispose();
	});

	test("conflict surfaces; store unchanged", async () => {
		const fake = createFakeClient({
			entries: [sampleEntry],
			conflictOnRevision: "rev-1",
		});
		const clock = createFakeTimers();
		let status: AuthoringStatus = "idle";
		let errCode: string | null = null;

		const ctrl = createAutosaveController({
			debounceMs: 10,
			timers: clock.timers,
			isClientValid: () => true,
			save: async (data) => {
				const result = await fake.client.upsertEntry({
					id: "hello",
					collection: "posts",
					data,
					expectedRevision: "rev-1",
				});
				if (!result.ok) {
					return {
						ok: false,
						code: result.code,
						message: result.message,
					};
				}
				return { ok: true, entry: result.value };
			},
			onStatus: (s) => {
				status = s;
			},
			onError: (d) => {
				errCode = d.code;
			},
		});

		ctrl.handleChange({ title: "external-conflict" });
		clock.advance(10);
		await waitUntil(() => status === "conflict", "conflict settle");

		expect(status).toBe("conflict");
		expect(errCode).toBe("conflict");
		expect(fake.store[0]?.data.title).toBe("Hello");
		ctrl.dispose();
	});

	test("authoritative error status", async () => {
		const clock = createFakeTimers();
		let status: AuthoringStatus = "idle";

		const ctrl = createAutosaveController({
			debounceMs: 10,
			timers: clock.timers,
			isClientValid: () => true,
			save: async () => ({
				ok: false,
				code: "validation_failed",
				message: "bad",
				issues: [{ path: ["title"] }],
			}),
			onStatus: (s) => {
				status = s;
			},
		});

		ctrl.handleChange({ title: "x" });
		clock.advance(10);
		await waitUntil(
			() => status === "authoritative_error",
			"auth error settle",
		);

		expect(status).toBe("authoritative_error");
		ctrl.dispose();
	});
});

describe("authoring autosave self-host json", () => {
	let root: string;
	let ctrl: ReturnType<typeof createAutosaveController> | undefined;

	beforeEach(async () => {
		root = await mkdtemp(path.join(tmpdir(), "cms-autosave-"));
		const postsDir = path.join(root, "posts");
		await mkdir(postsDir, { recursive: true });
		await writeFile(
			path.join(postsDir, "hello.json"),
			`${JSON.stringify({ title: "Hello tracer" }, null, "\t")}\n`,
			"utf8",
		);
	});

	afterEach(async () => {
		ctrl?.dispose();
		ctrl = undefined;
		await rm(root, { recursive: true, force: true });
	});

	test("valid title autosave updates JSON; preview identity matches host route", async () => {
		const postsDir = path.join(root, "posts");
		const protocol = createCmsHost({
			root,
			allowPaths: ["posts"],
			writer: nodeFsWriter(),
			collections: [
				{
					name: "posts",
					label: "Posts",
					schema: z.object({ title: z.string() }),
					base: "posts",
					config: { label: "Posts", base: "posts" },
				},
			],
			capabilities: { deleteEntry: true, assets: { uploadImage: false } },
		}).protocol;

		const loaded = await protocol.getEntry("posts", "hello");
		expect(loaded.ok).toBe(true);
		if (!loaded.ok) return;

		let revision: string | null = loaded.value.revision;
		let status: AuthoringStatus = "idle";

		ctrl = createAutosaveController({
			debounceMs: 20,
			isClientValid: (data) =>
				z.object({ title: z.string() }).safeParse(data).success,
			save: async (data) => {
				const result = await protocol.upsertEntry({
					id: "hello",
					collection: "posts",
					data,
					expectedRevision: revision,
				});
				if (!result.ok) {
					return {
						ok: false,
						code: result.code,
						message: result.message,
						issues: result.issues,
					};
				}
				return { ok: true, entry: result.value };
			},
			onStatus: (s) => {
				status = s;
			},
			onSaved: (entry) => {
				revision = entry.revision;
			},
		});

		ctrl.handleChange({ title: "Autosaved title" });
		await waitUntil(() => status === "saved", "self-host autosave settle", 200);

		const json = await readFile(path.join(postsDir, "hello.json"), "utf8");
		/** Same contract as host `getPreviewUrl("posts", id)` (ADR-0013). */
		const preview = `/posts/${encodeURIComponent("hello")}`;

		const reread = await protocol.getEntry("posts", "hello");
		const previewPage = await readFile(
			path.resolve(
				path.dirname(fileURLToPath(import.meta.url)),
				"../../../../demos/astro-simple/src/pages/posts/[id].astro",
			),
			"utf8",
		);

		expect(json).toContain("Autosaved title");
		expect(preview).toBe("/posts/hello");
		expect(reread.ok).toBe(true);
		if (reread.ok) {
			expect(reread.value.data.title).toBe("Autosaved title");
		}
		expect(previewPage).toContain('getEntry("posts"');
		expect(previewPage).toContain("<h1>{title}</h1>");
		expect(previewPage).toContain('from "astro:assets"');
		expect(status).toBe("saved");
	});
});
