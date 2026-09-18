/**
 * Node FS writer (portable baseline).
 * Text writes replace the complete file via temp + rename (ADR-0014).
 */

import { randomBytes } from "node:crypto";
import {
	mkdir,
	readdir,
	readFile,
	rename,
	unlink,
	writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Writer } from "./types";

async function writeFileAtomic(
	path: string,
	contents: string | Uint8Array,
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const tmp = join(dirname(path), `.${randomBytes(8).toString("hex")}.cms-tmp`);
	try {
		await writeFile(tmp, contents);
		await rename(tmp, path);
	} catch (err) {
		try {
			await unlink(tmp);
		} catch {
			// best-effort cleanup of the temp file
		}
		throw err;
	}
}

export function nodeFsWriter(): Writer {
	return {
		async readText(path: string) {
			return await readFile(path, "utf8");
		},
		async writeText(path: string, contents: string) {
			await writeFileAtomic(path, contents);
		},
		async readBytes(path: string) {
			const buf = await readFile(path);
			return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
		},
		async writeBytes(path: string, contents: Uint8Array) {
			await writeFileAtomic(path, contents);
		},
		async remove(path: string) {
			await unlink(path);
		},
		async list(dir: string) {
			return await readdir(dir);
		},
	};
}
