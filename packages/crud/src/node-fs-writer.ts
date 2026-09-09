/**
 * PROTOTYPE / SPIKE — Node FS writer (portable baseline).
 */
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Writer } from "./types";

export function nodeFsWriter(): Writer {
	return {
		async readText(path: string) {
			return await readFile(path, "utf8");
		},
		async writeText(path: string, contents: string) {
			await mkdir(dirname(path), { recursive: true });
			await writeFile(path, contents, "utf8");
		},
		async readBytes(path: string) {
			const buf = await readFile(path);
			return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
		},
		async writeBytes(path: string, contents: Uint8Array) {
			await mkdir(dirname(path), { recursive: true });
			await writeFile(path, contents);
		},
		async remove(path: string) {
			await unlink(path);
		},
		async list(dir: string) {
			return await readdir(dir);
		},
	};
}
