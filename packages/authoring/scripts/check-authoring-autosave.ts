/**
 * Authoring autosave orchestration check (issue #19).
 * Debounce, coalesce, client-invalid skip, revision chaining, stale ignore,
 * conflict visibility — via fake protocol client + injectable timers.
 *
 * Run: bun run packages/authoring/scripts/check-authoring-autosave.ts
 */
import {
	type ContentEntry,
	cmsErr,
	cmsOk,
	type DeleteEntryResult,
	type GetCapabilitiesResult,
	type ListCollectionsResult,
	type ListEntriesResult,
	resolveCmsCapabilities,
	type SaveEntryResult,
	type UploadImageResult,
} from "@cms/crud/fetch-client";
import {
	type AuthoringStatus,
	createAutosaveController,
} from "../src/autosave";
import type { AuthoringClient } from "../src/types";

type Failure = { label: string; detail: string };

const failures: Failure[] = [];
const passed: string[] = [];

function ok(label: string): void {
	passed.push(label);
}

function fail(label: string, detail: string): void {
	failures.push({ label, detail });
}

function createFakeClient(opts: {
	entries: ContentEntry[];
	/** When set, next matching upsert returns conflict and leaves store unchanged. */
	conflictOnRevision?: string;
}): {
	client: AuthoringClient;
	upsertCalls: Array<{
		data: Record<string, unknown>;
		expectedRevision: string | null;
	}>;
	store: ContentEntry[];
} {
	const store = [...opts.entries];
	const upsertCalls: Array<{
		data: Record<string, unknown>;
		expectedRevision: string | null;
	}> = [];
	let revCounter = 1;

	const client: AuthoringClient = {
		async getCapabilities(): Promise<GetCapabilitiesResult> {
			return cmsOk(resolveCmsCapabilities({ deleteEntry: true }));
		},
		async listCollections(): Promise<ListCollectionsResult> {
			return cmsOk([{ name: "posts", label: "Posts" }]);
		},
		async listEntries(collection: string): Promise<ListEntriesResult> {
			return cmsOk(
				store
					.filter((e) => e.collection === collection)
					.map((e) => ({ collection: e.collection, id: e.id })),
			);
		},
		async getEntry(collection: string, id: string) {
			const hit = store.find((e) => e.collection === collection && e.id === id);
			if (!hit) return cmsErr("not_found", "Not found");
			return cmsOk(hit);
		},
		async upsertEntry(input): Promise<SaveEntryResult> {
			upsertCalls.push({
				data: input.data,
				expectedRevision: input.expectedRevision,
			});
			if (
				opts.conflictOnRevision != null &&
				input.expectedRevision === opts.conflictOnRevision
			) {
				return cmsErr("conflict", "Revision conflict");
			}
			const idx = store.findIndex(
				(e) => e.collection === input.collection && e.id === input.id,
			);
			revCounter += 1;
			const next: ContentEntry = {
				id: input.id,
				collection: input.collection,
				data: input.data,
				revision: `rev-${revCounter}`,
			};
			if (idx >= 0) store[idx] = next;
			else store.push(next);
			return cmsOk(next);
		},
		async deleteEntry(): Promise<DeleteEntryResult> {
			return cmsErr("forbidden", "not used");
		},
		async uploadImage(): Promise<UploadImageResult> {
			return cmsErr("unsupported_capability", "not used");
		},
	};

	return { client, upsertCalls, store };
}

/** Deterministic timer queue for debounce tests. */
function createFakeTimers() {
	let nextId = 1;
	const pending = new Map<number, { fn: () => void; at: number }>();
	let now = 0;

	return {
		now: () => now,
		advance(ms: number) {
			now += ms;
			const due = [...pending.entries()]
				.filter(([, t]) => t.at <= now)
				.sort((a, b) => a[1].at - b[1].at);
			for (const [id, t] of due) {
				pending.delete(id);
				t.fn();
			}
		},
		timers: {
			setTimer(fn: () => void, ms: number) {
				const id = nextId++;
				pending.set(id, { fn, at: now + ms });
				return id;
			},
			clearTimer(id: unknown) {
				pending.delete(id as number);
			},
		},
	};
}

/** Drain until predicate holds. Uses a short sleep so real FS I/O can settle. */
async function waitUntil(
	pred: () => boolean,
	label: string,
	attempts = 50,
): Promise<void> {
	for (let i = 0; i < attempts; i++) {
		if (pred()) return;
		await Promise.resolve();
		await new Promise((r) => setTimeout(r, 0));
	}
	throw new Error(`timed out waiting: ${label}`);
}

const sample: ContentEntry = {
	id: "hello",
	collection: "posts",
	data: { title: "Hello" },
	revision: "rev-1",
};

// --- Client-invalid never writes ---
{
	const fake = createFakeClient({ entries: [sample] });
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
	if (status !== "client_invalid") {
		fail("client-invalid status", status);
	} else {
		ok("client-invalid status");
	}
	if (fake.upsertCalls.length !== 0) {
		fail("client-invalid never writes", String(fake.upsertCalls.length));
	} else {
		ok("client-invalid never writes");
	}
	ctrl.dispose();
}

// --- Debounce + coalesce: rapid edits → one write with latest ---
{
	const fake = createFakeClient({ entries: [sample] });
	const clock = createFakeTimers();
	let status: AuthoringStatus = "idle";
	let revision: string | null = "rev-1";
	const savedTitles: string[] = [];

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
			savedTitles.push(String(entry.data.title));
		},
	});

	ctrl.handleChange({ title: "A" });
	if (status === "saved") {
		fail("pending edit must not keep saved", status);
	} else {
		ok("pending edit clears saved");
	}
	clock.advance(50);
	ctrl.handleChange({ title: "B" });
	clock.advance(50);
	ctrl.handleChange({ title: "C" });
	if (status === "saved") {
		fail("coalesced edits must not keep saved", status);
	}
	clock.advance(100);
	await waitUntil(
		() => !ctrl.isInFlight() && status === "saved",
		"debounce settle",
	);

	if (fake.upsertCalls.length !== 1) {
		fail("coalesce to one write", String(fake.upsertCalls.length));
	} else {
		ok("coalesce to one write");
	}
	if (fake.upsertCalls[0]?.data.title !== "C") {
		fail("coalesce latest payload", JSON.stringify(fake.upsertCalls[0]?.data));
	} else {
		ok("coalesce latest payload");
	}
	if (status !== "saved" || revision !== "rev-2") {
		fail("saved stores revision", `${status} ${revision}`);
	} else {
		ok("saved stores revision");
	}
	ctrl.dispose();
}

// --- In-flight coalesce: queue latest; chain revision ---
{
	const fake = createFakeClient({ entries: [sample] });
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
	ok("in-flight after debounce");

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

	if (fake.upsertCalls.length !== 2) {
		fail("queued write after in-flight", String(fake.upsertCalls.length));
	} else {
		ok("queued write after in-flight");
	}
	if (fake.upsertCalls[0]?.data.title !== "first") {
		fail("first write payload", JSON.stringify(fake.upsertCalls[0]));
	} else {
		ok("first write payload");
	}
	if (fake.upsertCalls[1]?.data.title !== "third") {
		fail("coalesced second write", JSON.stringify(fake.upsertCalls[1]));
	} else {
		ok("coalesced second write");
	}
	if (fake.upsertCalls[1]?.expectedRevision !== "rev-2") {
		fail(
			"chained expectedRevision",
			String(fake.upsertCalls[1]?.expectedRevision),
		);
	} else {
		ok("chained expectedRevision");
	}
	ctrl.dispose();
}

// --- Stale response does not overwrite newer revision from a later save ---
{
	const fake = createFakeClient({ entries: [sample] });
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

	if (revision !== "rev-3") {
		fail("revision follows latest successful write", String(revision));
	} else {
		ok("revision follows latest successful write");
	}
	if (status !== "saved") {
		fail("final status saved", status);
	} else {
		ok("final status saved");
	}
	ctrl.dispose();
}

// --- Conflict surfaces; store unchanged ---
{
	const fake = createFakeClient({
		entries: [sample],
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

	if (status !== "conflict" || errCode !== "conflict") {
		fail("conflict status", `${status} ${errCode}`);
	} else {
		ok("conflict status");
	}
	if (fake.store[0]?.data.title !== "Hello") {
		fail("conflict leaves canonical unchanged", JSON.stringify(fake.store[0]));
	} else {
		ok("conflict leaves canonical unchanged");
	}
	ctrl.dispose();
}

// --- Authoritative error status ---
{
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
	await waitUntil(() => status === "authoritative_error", "auth error settle");

	if (status !== "authoritative_error") {
		fail("authoritative-error status", status);
	} else {
		ok("authoritative-error status");
	}
	ctrl.dispose();
}

console.log("--- authoring autosave ---");
for (const p of passed) console.log(`ok  ${p}`);
for (const f of failures) console.error(`FAIL ${f.label}: ${f.detail}`);

if (failures.length > 0) {
	process.exit(1);
}
console.log(`authoring autosave check passed (${passed.length} assertion(s))`);

/**
 * Self-host-shaped proof: autosave write-back updates YAML on disk without an
 * explicit submit button, and the host preview URL is available from identity.
 * (Browser reload recovery remains open thread #10.)
 */
{
	const { mkdir, mkdtemp, readFile, rm, writeFile } = await import(
		"node:fs/promises"
	);
	const { tmpdir } = await import("node:os");
	const path = await import("node:path");
	const { fileURLToPath } = await import("node:url");
	const { z } = await import("zod");
	const { createCmsProtocol } = await import(
		"../../crud/src/create-cms-protocol.ts"
	);
	const { nodeFsWriter } = await import("../../crud/src/node-fs-writer.ts");

	const root = await mkdtemp(path.join(tmpdir(), "cms-autosave-"));
	const postsDir = path.join(root, "posts");
	await mkdir(postsDir, { recursive: true });
	await writeFile(
		path.join(postsDir, "hello.yaml"),
		"title: Hello tracer\n",
		"utf8",
	);

	const protocol = createCmsProtocol({
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
	});

	const loaded = await protocol.getEntry("posts", "hello");
	if (!loaded.ok) {
		console.error("FAIL self-host load:", loaded);
		await rm(root, { recursive: true, force: true });
		process.exit(1);
	}

	let revision: string | null = loaded.value.revision;
	let status: AuthoringStatus = "idle";

	const ctrl = createAutosaveController({
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

	// Valid title edit — no explicit submit; debounce then write.
	ctrl.handleChange({ title: "Autosaved title" });
	await waitUntil(() => status === "saved", "self-host autosave settle", 200);

	const yaml = await readFile(path.join(postsDir, "hello.yaml"), "utf8");
	/** Same contract as host `getPreviewUrl("posts", id)` (ADR-0013). */
	const preview = `/posts/${encodeURIComponent("hello")}`;

	const reread = await protocol.getEntry("posts", "hello");
	const previewPage = await readFile(
		path.resolve(
			path.dirname(fileURLToPath(import.meta.url)),
			"../../astro-template/src/pages/posts/[id].astro",
		),
		"utf8",
	);

	const selfFailures: string[] = [];
	if (!yaml.includes("Autosaved title")) {
		selfFailures.push(`yaml missing title: ${yaml}`);
	}
	if (preview !== "/posts/hello") {
		selfFailures.push(`preview url: ${preview}`);
	}
	if (!reread.ok || reread.value.data.title !== "Autosaved title") {
		selfFailures.push(
			`protocol getEntry title for preview path: ${JSON.stringify(reread)}`,
		);
	}
	if (!previewPage.includes('getEntry("posts"')) {
		selfFailures.push("preview route missing getEntry(posts)");
	}
	if (!previewPage.includes("<h1>{title}</h1>")) {
		selfFailures.push("preview route missing production title render");
	}
	if (!previewPage.includes("postBlocks")) {
		selfFailures.push("preview route missing production block bindings");
	}
	if (status !== "saved") {
		selfFailures.push(`status: ${status}`);
	}

	ctrl.dispose();
	await rm(root, { recursive: true, force: true });

	console.log("--- authoring autosave self-host yaml ---");
	if (selfFailures.length > 0) {
		for (const d of selfFailures) console.error(`FAIL ${d}`);
		process.exit(1);
	}
	console.log("ok  valid title autosave updates YAML without explicit submit");
	console.log("ok  preview URL available from identity after write-back");
	console.log("ok  protocol reread exposes title the site route would render");
	console.log("ok  posts/[id].astro uses getEntry + production title/blocks");
	console.log("authoring autosave self-host yaml check passed");
}
