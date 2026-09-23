/**
 * Atomic filesystem write: temp sibling + rename.
 * Never leaves a truncated destination on process kill mid-write of the temp.
 */

import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function atomicWriteFile(destination: string, contents: string): void {
	mkdirSync(dirname(destination), { recursive: true });
	const tempPath = `${destination}.${process.pid}.${Date.now()}.tmp`;
	writeFileSync(tempPath, contents, "utf8");
	renameSync(tempPath, destination);
}
