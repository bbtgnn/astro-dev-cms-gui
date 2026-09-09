/**
 * PROTOTYPE / SPIKE — @cms/crud
 * Write mode = domain ops + Zod + path map. Writer = low-level FS.
 */

export { createFetchClient } from "./fetch-client.ts";
export { memoryWriter } from "./memory-writer.ts";
export { nodeFsWriter } from "./node-fs-writer.ts";
export type {
	ContentEntry,
	CreateWriteModeOptions,
	WriteMode,
	Writer,
} from "./types.ts";
export { createWriteMode } from "./write-mode.ts";
