/**
 * Shared write-back + read-side protocol contract harness.
 * #11: WriteMode list/read/save against memory + filesystem.
 * #12: CmsProtocol read-side outcomes against the same backends.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import {
	adaptWriteModeToProtocol,
	createCmsProtocol,
} from "../src/create-cms-protocol";
import type { DiscoveredCollection } from "../src/discovery";
import { memoryWriter } from "../src/memory-writer";
import { nodeFsWriter } from "../src/node-fs-writer";
import type { CmsProtocol } from "../src/protocol";
import type { WriteMode, Writer } from "../src/types";
import { createWriteMode } from "../src/write-mode";

export type WriterBackend = "memory" | "filesystem";

export type ContractFailure = {
	backend: WriterBackend;
	label: string;
	detail: string;
};

export type ContractRunResult = {
	ok: boolean;
	failures: ContractFailure[];
	passed: Array<{ backend: WriterBackend; label: string }>;
};

type Rejection = { status?: number; message?: string; code?: string };

type BackendFixture = {
	backend: WriterBackend;
	root: string;
	writer: Writer;
	cleanup: () => Promise<void>;
	/** Seed a relative path under root (for collision / pre-existing files). */
	seedFile: (relPath: string, contents: string) => Promise<void>;
};

const postsSchema = z.object({
	title: z.string(),
});

const postsCollection: DiscoveredCollection = {
	name: "posts",
	label: "Posts",
	schema: postsSchema,
	base: "posts",
	config: { label: "Posts", base: "posts" },
};

function statusOf(err: unknown): number | undefined {
	return (err as Rejection).status;
}

function messageOf(err: unknown): string | undefined {
	return (err as Rejection).message;
}

async function expectReject(
	failures: ContractFailure[],
	passed: ContractRunResult["passed"],
	backend: WriterBackend,
	label: string,
	fn: () => Promise<unknown>,
	status: number,
): Promise<void> {
	try {
		await fn();
		failures.push({
			backend,
			label,
			detail: `expected rejection with status ${status}`,
		});
	} catch (err) {
		const got = statusOf(err);
		if (got === status) {
			passed.push({ backend, label });
		} else {
			failures.push({
				backend,
				label,
				detail: `status=${got} msg=${messageOf(err)} (expected ${status})`,
			});
		}
	}
}

function discoveryMode(
	root: string,
	writer: Writer,
	extras?: Partial<Parameters<typeof createWriteMode>[0]>,
): WriteMode {
	return createWriteMode({
		root,
		allowPaths: ["posts"],
		writer,
		collections: [postsCollection],
		...extras,
	});
}

/** Allowlist / pathMap deny scenarios (retained from check-allowlist). */
async function runAllowlistScenarios(
	fixture: BackendFixture,
	failures: ContractFailure[],
	passed: ContractRunResult["passed"],
): Promise<void> {
	const { backend, root, writer } = fixture;
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

	await expectReject(
		failures,
		passed,
		backend,
		"traversal escapes allowlist",
		() =>
			wm.upsertEntry({
				id: "evil",
				collection: "posts",
				data: { title: "nope" },
				expectedRevision: null,
			}),
		403,
	);

	await expectReject(
		failures,
		passed,
		backend,
		"path outside allowlist roots",
		() =>
			wm.upsertEntry({
				id: "env",
				collection: "secrets",
				data: { x: 1 },
				expectedRevision: null,
			}),
		403,
	);

	await expectReject(
		failures,
		passed,
		backend,
		"unsafe nested id",
		() =>
			wm.upsertEntry({
				id: "../escape",
				collection: "posts",
				data: { title: "nope" },
				expectedRevision: null,
			}),
		400,
	);
}

async function runYamlCollisionScenario(
	fixture: BackendFixture,
	failures: ContractFailure[],
	passed: ContractRunResult["passed"],
): Promise<void> {
	const { backend, root, writer } = fixture;
	await fixture.seedFile("posts/both.yaml", "title: a\n");
	await fixture.seedFile("posts/both.yml", "title: b\n");

	const collideMode = discoveryMode(root, writer);
	await expectReject(
		failures,
		passed,
		backend,
		"yaml+yml collision",
		() => collideMode.getEntry("posts", "both"),
		409,
	);
}

async function runListReadSaveScenarios(
	fixture: BackendFixture,
	failures: ContractFailure[],
	passed: ContractRunResult["passed"],
): Promise<void> {
	const { backend, root, writer } = fixture;
	const wm = discoveryMode(root, writer);

	const colls = await wm.listCollections();
	if (!colls.some((c) => c.name === "posts" && c.label === "Posts")) {
		failures.push({
			backend,
			label: "listCollections returns discovered posts",
			detail: JSON.stringify(colls),
		});
	} else {
		passed.push({
			backend,
			label: "listCollections returns discovered posts",
		});
	}

	const created = await wm.upsertEntry({
		id: "ok",
		collection: "posts",
		data: { title: "yes" },
		expectedRevision: null,
	});

	if (typeof created.revision !== "string" || created.revision.length === 0) {
		failures.push({
			backend,
			label: "create returns opaque revision",
			detail: JSON.stringify(created),
		});
	} else {
		passed.push({ backend, label: "create returns opaque revision" });
	}

	const listed = await wm.listEntries("posts");
	if (!listed.some((e) => e.id === "ok")) {
		failures.push({
			backend,
			label: "listEntries includes upserted id",
			detail: JSON.stringify(listed),
		});
	} else {
		passed.push({ backend, label: "listEntries includes upserted id" });
	}

	const read = await wm.getEntry("posts", "ok");
	if (
		read?.id !== "ok" ||
		read.collection !== "posts" ||
		read.data.title !== "yes" ||
		read.revision !== created.revision
	) {
		failures.push({
			backend,
			label: "valid persisted input round-trips with revision",
			detail: JSON.stringify(read),
		});
	} else {
		passed.push({
			backend,
			label: "valid persisted input round-trips with revision",
		});
	}

	await expectReject(
		failures,
		passed,
		backend,
		"invalid persisted input rejected",
		() =>
			wm.upsertEntry({
				id: "ok",
				collection: "posts",
				data: { title: 1 },
				expectedRevision: created.revision,
			}),
		400,
	);

	const afterInvalid = await wm.getEntry("posts", "ok");
	if (
		afterInvalid?.data.title !== "yes" ||
		afterInvalid.revision !== created.revision
	) {
		failures.push({
			backend,
			label: "invalid save does not replace canonical",
			detail: JSON.stringify(afterInvalid),
		});
	} else {
		passed.push({
			backend,
			label: "invalid save does not replace canonical",
		});
	}

	const missing = await wm.getEntry("posts", "does-not-exist");
	if (missing !== null) {
		failures.push({
			backend,
			label: "missing entry returns null",
			detail: JSON.stringify(missing),
		});
	} else {
		passed.push({ backend, label: "missing entry returns null" });
	}

	const unknownCollection = await wm.listEntries("no-such-collection");
	if (unknownCollection.length !== 0) {
		failures.push({
			backend,
			label: "unknown collection list is empty",
			detail: JSON.stringify(unknownCollection),
		});
	} else {
		passed.push({ backend, label: "unknown collection list is empty" });
	}

	const missingCollectionEntry = await wm.getEntry("no-such-collection", "x");
	if (missingCollectionEntry !== null) {
		failures.push({
			backend,
			label: "unknown collection get returns null",
			detail: JSON.stringify(missingCollectionEntry),
		});
	} else {
		passed.push({ backend, label: "unknown collection get returns null" });
	}

	// Guarded update + stale conflict (WriteMode seam).
	const updated = await wm.upsertEntry({
		id: "ok",
		collection: "posts",
		data: { title: "updated" },
		expectedRevision: created.revision,
	});
	if (
		updated.data.title !== "updated" ||
		updated.revision === created.revision
	) {
		failures.push({
			backend,
			label: "guarded save returns new revision",
			detail: JSON.stringify(updated),
		});
	} else {
		passed.push({ backend, label: "guarded save returns new revision" });
	}

	await expectReject(
		failures,
		passed,
		backend,
		"stale revision is conflict",
		() =>
			wm.upsertEntry({
				id: "ok",
				collection: "posts",
				data: { title: "stale" },
				expectedRevision: created.revision,
			}),
		409,
	);

	const afterStale = await wm.getEntry("posts", "ok");
	if (afterStale?.data.title !== "updated") {
		failures.push({
			backend,
			label: "stale save leaves canonical unchanged",
			detail: JSON.stringify(afterStale),
		});
	} else {
		passed.push({
			backend,
			label: "stale save leaves canonical unchanged",
		});
	}

	await expectReject(
		failures,
		passed,
		backend,
		"create when exists is conflict",
		() =>
			wm.upsertEntry({
				id: "ok",
				collection: "posts",
				data: { title: "again" },
				expectedRevision: null,
			}),
		409,
	);

	// External edit changes revision and blocks stale shell writes.
	await fixture.seedFile("posts/ok.yaml", "title: external\n");
	const afterExternal = await wm.getEntry("posts", "ok");
	if (
		afterExternal?.data.title !== "external" ||
		afterExternal.revision === updated.revision
	) {
		failures.push({
			backend,
			label: "external edit changes opaque revision",
			detail: JSON.stringify(afterExternal),
		});
	} else {
		passed.push({
			backend,
			label: "external edit changes opaque revision",
		});
	}

	await expectReject(
		failures,
		passed,
		backend,
		"save after external edit is conflict",
		() =>
			wm.upsertEntry({
				id: "ok",
				collection: "posts",
				data: { title: "overwrite" },
				expectedRevision: updated.revision,
			}),
		409,
	);

	const stillExternal = await wm.getEntry("posts", "ok");
	if (stillExternal?.data.title !== "external") {
		failures.push({
			backend,
			label: "conflict after external edit leaves file unchanged",
			detail: JSON.stringify(stillExternal),
		});
	} else {
		passed.push({
			backend,
			label: "conflict after external edit leaves file unchanged",
		});
	}
}

async function createMemoryFixture(): Promise<BackendFixture> {
	// Synthetic root — memoryWriter keys paths; no real directory is created.
	const root = path.resolve("/cms-write-back-contract-memory");
	const writer = memoryWriter();
	return {
		backend: "memory",
		root,
		writer,
		cleanup: async () => {},
		seedFile: async (relPath, contents) => {
			await writer.writeText(path.join(root, relPath), contents);
		},
	};
}

async function createFilesystemFixture(): Promise<BackendFixture> {
	const root = await mkdtemp(path.join(tmpdir(), "cms-write-back-"));
	const writer = nodeFsWriter();
	return {
		backend: "filesystem",
		root,
		writer,
		cleanup: async () => {
			await rm(root, { recursive: true, force: true });
		},
		seedFile: async (relPath, contents) => {
			const abs = path.join(root, relPath);
			await mkdir(path.dirname(abs), { recursive: true });
			await writeFile(abs, contents, "utf8");
		},
	};
}

/**
 * Run the full contract suite once per backend.
 * Same scenarios for memory and filesystem write-back.
 */
export async function runWriteBackContract(
	backends: WriterBackend[] = ["memory", "filesystem"],
): Promise<ContractRunResult> {
	const failures: ContractFailure[] = [];
	const passed: ContractRunResult["passed"] = [];

	for (const kind of backends) {
		const fixture =
			kind === "memory"
				? await createMemoryFixture()
				: await createFilesystemFixture();
		try {
			await runAllowlistScenarios(fixture, failures, passed);
			await runListReadSaveScenarios(fixture, failures, passed);
			await runYamlCollisionScenario(fixture, failures, passed);
		} finally {
			await fixture.cleanup();
		}
	}

	return { ok: failures.length === 0, failures, passed };
}

function assertNoFilesystemPaths(
	value: unknown,
	failures: ContractFailure[],
	passed: ContractRunResult["passed"],
	backend: WriterBackend,
	label: string,
): void {
	const encoded = JSON.stringify(value);
	const leaks =
		encoded.includes("\\\\") ||
		/"(?:\/|file:|[A-Za-z]:\\)/.test(encoded) ||
		encoded.includes('"root"') ||
		encoded.includes('"absolutePath"') ||
		encoded.includes('"pathMap"');
	if (leaks) {
		failures.push({
			backend,
			label,
			detail: encoded.slice(0, 400),
		});
	} else {
		passed.push({ backend, label });
	}
}

function discoveryProtocol(
	root: string,
	writer: Writer,
	extras?: Partial<Parameters<typeof createWriteMode>[0]>,
): CmsProtocol {
	return createCmsProtocol({
		root,
		allowPaths: ["posts"],
		writer,
		collections: [postsCollection],
		...extras,
	});
}

/**
 * Read-side CMS protocol contract — same scenarios on memory + filesystem.
 * Outcomes are typed (`not_found` / `forbidden` / `conflict`); payloads stay
 * free of filesystem paths.
 */
async function runReadSideProtocolScenarios(
	fixture: BackendFixture,
	failures: ContractFailure[],
	passed: ContractRunResult["passed"],
): Promise<void> {
	const { backend, root, writer } = fixture;
	const protocol = discoveryProtocol(root, writer);

	const colls = await protocol.listCollections();
	if (
		!colls.ok ||
		!colls.value.some((c) => c.name === "posts" && c.label === "Posts")
	) {
		failures.push({
			backend,
			label: "protocol listCollections returns summaries",
			detail: JSON.stringify(colls),
		});
	} else {
		passed.push({
			backend,
			label: "protocol listCollections returns summaries",
		});
		assertNoFilesystemPaths(
			colls.value,
			failures,
			passed,
			backend,
			"protocol collection summaries have no FS paths",
		);
	}

	const created = await protocol.upsertEntry({
		id: "ok",
		collection: "posts",
		data: { title: "yes" },
		expectedRevision: null,
	});
	if (
		!created.ok ||
		typeof created.value.revision !== "string" ||
		created.value.revision.length === 0
	) {
		failures.push({
			backend,
			label: "protocol create returns opaque revision",
			detail: JSON.stringify(created),
		});
	} else {
		passed.push({
			backend,
			label: "protocol create returns opaque revision",
		});
	}

	const listed = await protocol.listEntries("posts");
	if (
		!listed.ok ||
		!listed.value.some((e) => e.collection === "posts" && e.id === "ok")
	) {
		failures.push({
			backend,
			label: "protocol listEntries returns entry identities",
			detail: JSON.stringify(listed),
		});
	} else {
		passed.push({
			backend,
			label: "protocol listEntries returns entry identities",
		});
		assertNoFilesystemPaths(
			listed.value,
			failures,
			passed,
			backend,
			"protocol entry identities have no FS paths",
		);
	}

	const read = await protocol.getEntry("posts", "ok");
	if (
		!read.ok ||
		read.value.id !== "ok" ||
		read.value.collection !== "posts" ||
		read.value.data.title !== "yes" ||
		!created.ok ||
		read.value.revision !== created.value.revision
	) {
		failures.push({
			backend,
			label: "protocol getEntry returns persisted input + revision",
			detail: JSON.stringify(read),
		});
	} else {
		passed.push({
			backend,
			label: "protocol getEntry returns persisted input + revision",
		});
		assertNoFilesystemPaths(
			read.value,
			failures,
			passed,
			backend,
			"protocol entry payload has no FS paths",
		);
	}

	const missing = await protocol.getEntry("posts", "does-not-exist");
	if (missing.ok || missing.code !== "not_found") {
		failures.push({
			backend,
			label: "protocol missing entry is not_found",
			detail: JSON.stringify(missing),
		});
	} else {
		passed.push({ backend, label: "protocol missing entry is not_found" });
	}

	const unknown = await protocol.getEntry("no-such-collection", "x");
	if (unknown.ok || unknown.code !== "not_found") {
		failures.push({
			backend,
			label: "protocol unknown collection get is not_found",
			detail: JSON.stringify(unknown),
		});
	} else {
		passed.push({
			backend,
			label: "protocol unknown collection get is not_found",
		});
	}

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
	if (forbidden.ok || forbidden.code !== "forbidden") {
		failures.push({
			backend,
			label: "protocol forbidden read is forbidden",
			detail: JSON.stringify(forbidden),
		});
	} else {
		passed.push({ backend, label: "protocol forbidden read is forbidden" });
	}

	await fixture.seedFile("posts/both.yaml", "title: a\n");
	await fixture.seedFile("posts/both.yml", "title: b\n");
	const collide = await discoveryProtocol(root, writer).getEntry(
		"posts",
		"both",
	);
	if (collide.ok || collide.code !== "conflict") {
		failures.push({
			backend,
			label: "protocol yaml collision is conflict",
			detail: JSON.stringify(collide),
		});
	} else {
		passed.push({ backend, label: "protocol yaml collision is conflict" });
	}
}

/**
 * Write-side CMS protocol contract — guarded save, validation, conflict.
 * Same scenarios on memory + filesystem.
 */
async function runWriteSideProtocolScenarios(
	fixture: BackendFixture,
	failures: ContractFailure[],
	passed: ContractRunResult["passed"],
): Promise<void> {
	const { backend, root, writer } = fixture;
	const protocol = discoveryProtocol(root, writer);

	const created = await protocol.upsertEntry({
		id: "guard",
		collection: "posts",
		data: { title: "first" },
		expectedRevision: null,
	});
	if (!created.ok) {
		failures.push({
			backend,
			label: "protocol valid create succeeds",
			detail: JSON.stringify(created),
		});
		return;
	}
	passed.push({ backend, label: "protocol valid create succeeds" });

	const saved = await protocol.upsertEntry({
		id: "guard",
		collection: "posts",
		data: { title: "second" },
		expectedRevision: created.value.revision,
	});
	if (
		!saved.ok ||
		saved.value.data.title !== "second" ||
		saved.value.revision === created.value.revision
	) {
		failures.push({
			backend,
			label: "protocol guarded save returns new revision",
			detail: JSON.stringify(saved),
		});
	} else {
		passed.push({
			backend,
			label: "protocol guarded save returns new revision",
		});
	}

	const stale = await protocol.upsertEntry({
		id: "guard",
		collection: "posts",
		data: { title: "stale" },
		expectedRevision: created.value.revision,
	});
	if (stale.ok || stale.code !== "conflict") {
		failures.push({
			backend,
			label: "protocol stale save is conflict",
			detail: JSON.stringify(stale),
		});
	} else {
		passed.push({ backend, label: "protocol stale save is conflict" });
	}

	const afterStale = await protocol.getEntry("posts", "guard");
	if (!afterStale.ok || afterStale.value.data.title !== "second") {
		failures.push({
			backend,
			label: "protocol conflict leaves canonical unchanged",
			detail: JSON.stringify(afterStale),
		});
	} else {
		passed.push({
			backend,
			label: "protocol conflict leaves canonical unchanged",
		});
	}

	const invalid = await protocol.upsertEntry({
		id: "guard",
		collection: "posts",
		data: { title: 99 },
		expectedRevision: saved.ok ? saved.value.revision : null,
	});
	if (
		invalid.ok ||
		invalid.code !== "validation_failed" ||
		invalid.issues == null
	) {
		failures.push({
			backend,
			label: "protocol invalid save is validation_failed",
			detail: JSON.stringify(invalid),
		});
	} else {
		passed.push({
			backend,
			label: "protocol invalid save is validation_failed",
		});
	}

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
	if (
		!transformed.ok ||
		!reread.ok ||
		reread.value.data.title !== "mixedCase"
	) {
		failures.push({
			backend,
			label: "protocol serializes accepted input not transform output",
			detail: JSON.stringify({ transformed, reread }),
		});
	} else {
		passed.push({
			backend,
			label: "protocol serializes accepted input not transform output",
		});
	}

	// Complete YAML document replacement after save.
	if (backend === "filesystem") {
		const abs = path.join(root, "posts/guard.yaml");
		const { readFile } = await import("node:fs/promises");
		const raw = await readFile(abs, "utf8");
		if (raw !== "title: second\n") {
			failures.push({
				backend,
				label: "filesystem write replaces complete YAML document",
				detail: JSON.stringify(raw),
			});
		} else {
			passed.push({
				backend,
				label: "filesystem write replaces complete YAML document",
			});
		}
	}

	await fixture.seedFile("posts/guard.yaml", "title: external\n");
	const afterExternal = await protocol.getEntry("posts", "guard");
	const conflictExternal = await protocol.upsertEntry({
		id: "guard",
		collection: "posts",
		data: { title: "overwrite" },
		expectedRevision: saved.ok ? saved.value.revision : "bogus",
	});
	const stillExternal = await protocol.getEntry("posts", "guard");
	if (
		!afterExternal.ok ||
		afterExternal.value.data.title !== "external" ||
		conflictExternal.ok ||
		conflictExternal.code !== "conflict" ||
		!stillExternal.ok ||
		stillExternal.value.data.title !== "external"
	) {
		failures.push({
			backend,
			label: "protocol external-edit conflict leaves newer content",
			detail: JSON.stringify({
				afterExternal,
				conflictExternal,
				stillExternal,
			}),
		});
	} else {
		passed.push({
			backend,
			label: "protocol external-edit conflict leaves newer content",
		});
	}
}

/**
 * Read-side protocol contract suite (issue #12).
 * Runs the same scenarios against in-memory and filesystem implementations.
 */
export async function runReadSideProtocolContract(
	backends: WriterBackend[] = ["memory", "filesystem"],
): Promise<ContractRunResult> {
	const failures: ContractFailure[] = [];
	const passed: ContractRunResult["passed"] = [];

	for (const kind of backends) {
		const fixture =
			kind === "memory"
				? await createMemoryFixture()
				: await createFilesystemFixture();
		try {
			await runReadSideProtocolScenarios(fixture, failures, passed);
		} finally {
			await fixture.cleanup();
		}
	}

	return { ok: failures.length === 0, failures, passed };
}

/**
 * Write-side protocol contract suite (issue #13).
 * Guarded save, revision, validation_failed, and conflict outcomes.
 */
export async function runWriteSideProtocolContract(
	backends: WriterBackend[] = ["memory", "filesystem"],
): Promise<ContractRunResult> {
	const failures: ContractFailure[] = [];
	const passed: ContractRunResult["passed"] = [];

	for (const kind of backends) {
		const fixture =
			kind === "memory"
				? await createMemoryFixture()
				: await createFilesystemFixture();
		try {
			await runWriteSideProtocolScenarios(fixture, failures, passed);
		} finally {
			await fixture.cleanup();
		}
	}

	return { ok: failures.length === 0, failures, passed };
}
