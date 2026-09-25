/**
 * Shared fixtures for write-back + CMS protocol contract tests.
 * Memory and filesystem backends only — no pass/fail recording.
 */

import { expect } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import type { CollectionDescriptor } from "./collection-descriptors";
import { createCmsHost } from "./create-cms-protocol";
import { memoryWriter } from "./memory-writer";
import { nodeFsWriter } from "./node-fs-writer";
import type { CmsProtocol } from "./protocol";
import type { WriteMode, Writer } from "./types";
import { createWriteMode } from "./write-mode";

export type WriterBackend = "memory" | "filesystem";

export type BackendFixture = {
	backend: WriterBackend;
	root: string;
	writer: Writer;
	cleanup: () => Promise<void>;
	/** Seed a relative path under root (for collision / pre-existing files). */
	seedFile: (relPath: string, contents: string) => Promise<void>;
};

export const postsSchema = z.object({
	title: z.string(),
});

export const postsCollection: CollectionDescriptor = {
	name: "posts",
	label: "Posts",
	schema: postsSchema,
	base: "posts",
	config: { label: "Posts", base: "posts" },
};

export const WRITER_BACKENDS: WriterBackend[] = ["memory", "filesystem"];

export function discoveryMode(
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

export function discoveryProtocol(
	root: string,
	writer: Writer,
	extras?: Partial<Parameters<typeof createCmsHost>[0]>,
): CmsProtocol {
	return createCmsHost({
		root,
		allowPaths: ["posts"],
		writer,
		collections: [postsCollection],
		...extras,
	}).protocol;
}

/** Assert serialized protocol payloads do not leak filesystem paths (ADR-0005). */
export function expectNoFilesystemPaths(value: unknown): void {
	const encoded = JSON.stringify(value);
	const leaks =
		encoded.includes("\\\\") ||
		/"(?:\/|file:|[A-Za-z]:\\)/.test(encoded) ||
		encoded.includes('"root"') ||
		encoded.includes('"absolutePath"') ||
		encoded.includes('"pathMap"');
	expect(leaks).toBe(false);
}

export async function createMemoryFixture(): Promise<BackendFixture> {
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

export async function createFilesystemFixture(): Promise<BackendFixture> {
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

export async function createFixture(
	backend: WriterBackend,
): Promise<BackendFixture> {
	return backend === "memory"
		? createMemoryFixture()
		: createFilesystemFixture();
}
