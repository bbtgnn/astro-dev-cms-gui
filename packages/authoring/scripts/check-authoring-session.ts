/**
 * Authoring session seam (architecture candidate #2).
 * Guarded write-back, create→edit remount, preview eligibility, capability gates.
 * Debounce stays an internal seam — exercised only as observable timing.
 *
 * Run: bun run packages/authoring/scripts/check-authoring-session.ts
 */
import {
	type ContentEntry,
	resolveCmsCapabilities,
} from "@cms/crud/fetch-client";
import { z } from "zod";
import { createAuthoringSession } from "../src/session";
import { createCheckRecorder } from "./check-helpers";
import { createFakeClient } from "./fake-client";

const { ok, fail, finish } = createCheckRecorder();

const sample: ContentEntry = {
	id: "hello",
	collection: "posts",
	data: { title: "Hello" },
	revision: "rev-1",
};

const titleSchema = z.object({ title: z.string().min(1) });

/** Deterministic timer queue for debounce. */
function createFakeTimers() {
	let nextId = 1;
	const pending = new Map<number, { fn: () => void; at: number }>();
	let now = 0;

	return {
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

// --- Edit: guarded revision + no remount on successful save ---
{
	const fake = createFakeClient({ entries: [sample] });
	const clock = createFakeTimers();
	const session = createAuthoringSession({
		client: fake.client,
		collection: "posts",
		mode: { kind: "edit", entry: sample },
		schema: titleSchema,
		capabilities: resolveCmsCapabilities({ deleteEntry: true }),
		getPreviewUrl: (c, id) => `/${c}/${id}`,
		debounceMs: 50,
		timers: clock.timers,
	});

	const epoch0 = session.getSnapshot().formEpoch;
	if (session.getSnapshot().previewUrl !== null) {
		fail(
			"edit preview gated until write-back",
			String(session.getSnapshot().previewUrl),
		);
	} else {
		ok("edit preview gated until write-back");
	}

	session.handleChange({ title: "Hello edited" });
	clock.advance(50);
	await waitUntil(
		() => session.getSnapshot().saveStatus === "saved",
		"edit save",
	);

	if (fake.upsertCalls.length !== 1) {
		fail("edit one write", String(fake.upsertCalls.length));
	} else if (fake.upsertCalls[0]?.expectedRevision !== "rev-1") {
		fail(
			"edit sends loaded revision",
			String(fake.upsertCalls[0]?.expectedRevision),
		);
	} else {
		ok("edit sends loaded revision");
	}

	const snap = session.getSnapshot();
	if (snap.formEpoch !== epoch0) {
		fail("edit save does not remount", `${epoch0}→${snap.formEpoch}`);
	} else {
		ok("edit save does not remount");
	}
	if (snap.revision !== "rev-2") {
		fail("edit chains revision", String(snap.revision));
	} else {
		ok("edit chains revision");
	}
	if (snap.previewUrl !== "/posts/hello") {
		fail("edit preview after write-back", String(snap.previewUrl));
	} else {
		ok("edit preview after write-back");
	}

	session.handleChange({ title: "Again" });
	clock.advance(50);
	await waitUntil(
		() => session.getSnapshot().saveStatus === "saved",
		"second edit",
	);
	if (fake.upsertCalls[1]?.expectedRevision !== "rev-2") {
		fail(
			"second edit uses chained revision",
			String(fake.upsertCalls[1]?.expectedRevision),
		);
	} else {
		ok("second edit uses chained revision");
	}

	session.dispose();
}

// --- Create: null revision, remount into edit, preview eligibility ---
{
	const fake = createFakeClient({ entries: [] });
	const clock = createFakeTimers();
	const session = createAuthoringSession({
		client: fake.client,
		collection: "posts",
		mode: { kind: "create" },
		schema: titleSchema,
		capabilities: resolveCmsCapabilities({ deleteEntry: true }),
		getPreviewUrl: (c, id) => `/preview/${c}/${id}`,
		debounceMs: 50,
		timers: clock.timers,
	});

	if (!session.getSnapshot().creating) {
		fail("starts creating", "creating=false");
	} else {
		ok("starts creating");
	}
	if (session.getSnapshot().previewUrl !== null) {
		fail("create has no preview", String(session.getSnapshot().previewUrl));
	} else {
		ok("create has no preview");
	}

	session.handleChange({ title: "New" });
	clock.advance(50);
	await waitUntil(
		() => session.getSnapshot().saveStatus === "client_invalid",
		"create without id",
	);
	if (fake.upsertCalls.length !== 0) {
		fail("create without id never writes", String(fake.upsertCalls.length));
	} else {
		ok("create without id never writes");
	}

	const epoch0 = session.getSnapshot().formEpoch;
	session.setCreateId("brand-new");
	session.handleChange({ title: "New" });
	clock.advance(50);
	await waitUntil(
		() =>
			!session.getSnapshot().creating &&
			session.getSnapshot().saveStatus === "saved",
		"create save",
	);

	if (fake.upsertCalls[0]?.expectedRevision !== null) {
		fail(
			"create sends null revision",
			String(fake.upsertCalls[0]?.expectedRevision),
		);
	} else {
		ok("create sends null revision");
	}

	const snap = session.getSnapshot();
	if (snap.creating || snap.entryId !== "brand-new") {
		fail("create→edit identity", `${snap.creating} ${snap.entryId}`);
	} else {
		ok("create→edit identity");
	}
	if (snap.formEpoch <= epoch0) {
		fail("create→edit remounts", `${epoch0}→${snap.formEpoch}`);
	} else {
		ok("create→edit remounts");
	}
	if (snap.previewUrl !== "/preview/posts/brand-new") {
		fail("create preview after write-back", String(snap.previewUrl));
	} else {
		ok("create preview after write-back");
	}

	session.dispose();
}

// --- Capability gates on snapshot ---
{
	const fake = createFakeClient({
		capabilities: resolveCmsCapabilities({
			deleteEntry: false,
			assets: { uploadImage: false },
		}),
		entries: [sample],
	});
	const session = createAuthoringSession({
		client: fake.client,
		collection: "posts",
		mode: { kind: "edit", entry: sample },
		capabilities: resolveCmsCapabilities({
			deleteEntry: false,
			assets: { uploadImage: false },
		}),
	});
	const snap = session.getSnapshot();
	if (snap.canDelete || snap.canUploadAssets) {
		fail(
			"capabilities gate delete/upload",
			`delete=${snap.canDelete} upload=${snap.canUploadAssets}`,
		);
	} else {
		ok("capabilities gate delete/upload");
	}
	session.dispose();
}

{
	const fake = createFakeClient({
		capabilities: resolveCmsCapabilities({
			deleteEntry: true,
			assets: { uploadImage: true, maxUploadBytes: 1024 },
		}),
		entries: [sample],
	});
	const session = createAuthoringSession({
		client: fake.client,
		collection: "posts",
		mode: { kind: "edit", entry: sample },
		capabilities: resolveCmsCapabilities({
			deleteEntry: true,
			assets: { uploadImage: true, maxUploadBytes: 1024 },
		}),
	});
	const snap = session.getSnapshot();
	if (
		!snap.canDelete ||
		!snap.canUploadAssets ||
		snap.maxUploadBytes !== 1024
	) {
		fail(
			"capabilities offer delete/upload",
			JSON.stringify({
				canDelete: snap.canDelete,
				canUploadAssets: snap.canUploadAssets,
				maxUploadBytes: snap.maxUploadBytes,
			}),
		);
	} else {
		ok("capabilities offer delete/upload");
	}
	session.dispose();
}

// --- Conflict reload remounts with canonical revision ---
{
	const fake = createFakeClient({
		entries: [sample],
		conflictOnRevision: "rev-1",
	});
	const clock = createFakeTimers();
	const session = createAuthoringSession({
		client: fake.client,
		collection: "posts",
		mode: { kind: "edit", entry: sample },
		schema: titleSchema,
		debounceMs: 50,
		timers: clock.timers,
	});

	session.handleChange({ title: "Stale" });
	clock.advance(50);
	await waitUntil(
		() => session.getSnapshot().saveStatus === "conflict",
		"conflict",
	);

	// Mutate store as if another writer won.
	fake.store[0] = {
		...sample,
		data: { title: "Canonical" },
		revision: "rev-other",
	};
	const epochBefore = session.getSnapshot().formEpoch;
	await session.reload();
	const snap = session.getSnapshot();
	if (snap.formEpoch <= epochBefore) {
		fail("conflict reload remounts", `${epochBefore}→${snap.formEpoch}`);
	} else {
		ok("conflict reload remounts");
	}
	if (snap.revision !== "rev-other" || snap.formValue.title !== "Canonical") {
		fail(
			"conflict reload loads canonical",
			JSON.stringify({ revision: snap.revision, formValue: snap.formValue }),
		);
	} else {
		ok("conflict reload loads canonical");
	}

	session.dispose();
}

finish({
	title: "authoring session",
	passedLabel: "authoring session checks passed",
});
