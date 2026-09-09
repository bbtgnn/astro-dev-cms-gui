/**
 * PROTOTYPE / SPIKE — @cms/crud
 * Write mode = domain ops + Zod + discovery/path helpers. Writer = low-level FS.
 */

export type {
	DiscoverCollectionsOptions,
	DiscoveredCollection,
	LoaderPathHint,
} from "./discovery";
export {
	CMS_LOADER_HINT,
	discoverCollections,
	resolveCollectionSchema,
	scanYamlEntryIds,
	withLoaderPathHint,
} from "./discovery";
export { parseEntryFile, serializeEntryFile } from "./entry-file";
export { createFetchClient } from "./fetch-client";
export { memoryWriter } from "./memory-writer";
export { nodeFsWriter } from "./node-fs-writer";
export type {
	ResolvedYamlEntry,
	ResolveYamlEntryOptions,
	YamlExtension,
} from "./path-resolve";
export {
	applyPathTemplate,
	assertNoYamlExtCollision,
	assertSafeEntryId,
	DEFAULT_YAML_EXTENSION,
	entryRelPath,
	idFromRelPath,
	resolveYamlEntryPath,
	writerExists,
} from "./path-resolve";
export type {
	CollectionSummary,
	ContentEntry,
	CreateWriteModeOptions,
	WriteMode,
	Writer,
} from "./types";
export { createWriteMode } from "./write-mode";
