/**
 * PROTOTYPE / SPIKE — @cms/crud
 * Write mode = domain ops + Zod + path map. Writer = low-level FS.
 */
export type { ContentEntry, Writer, WriteMode, CreateWriteModeOptions } from "./types.ts";
export { createWriteMode } from "./write-mode.ts";
export { denoFsWriter } from "./deno-fs-writer.ts";
export { nodeFsWriter } from "./node-fs-writer.ts";
export { memoryWriter } from "./memory-writer.ts";
export { createFetchClient } from "./fetch-client.ts";
