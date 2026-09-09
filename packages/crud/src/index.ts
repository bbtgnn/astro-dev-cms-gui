/**
 * PROTOTYPE / SPIKE — @cms/crud
 * Write mode = domain ops + Zod + path map. Writer = low-level FS.
 */

export { createFetchClient } from "./fetch-client";
export { memoryWriter } from "./memory-writer";
export { nodeFsWriter } from "./node-fs-writer";
export type {
	ContentEntry,
	CreateWriteModeOptions,
	WriteMode,
	Writer,
} from "./types";
export { createWriteMode } from "./write-mode";
