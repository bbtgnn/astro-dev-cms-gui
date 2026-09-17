/**
 * PROTOTYPE / SPIKE — @cms/crud
 * Write mode = domain ops + Zod + discovery/path helpers. Writer = low-level FS.
 */

export {
	adaptWriteModeToProtocol,
	createCmsProtocol,
} from "./create-cms-protocol";
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
export {
	type CmsFetchClient,
	CmsFetchError,
	createFetchClient,
	isCmsFetchError,
} from "./fetch-client";
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
	CmsErr,
	CmsOk,
	CmsProtocol,
	CmsResult,
	EntryIdentity,
	GetEntryFailureCode,
	GetEntryResult,
	ListCollectionsResult,
	ListEntriesResult,
	SaveEntryFailureCode,
	SaveEntryResult,
} from "./protocol";
export { cmsErr, cmsOk, httpStatusForCmsErr } from "./protocol";
export { opaqueRevision } from "./revision";
export type {
	CollectionSummary,
	ContentEntry,
	CreateWriteModeOptions,
	ReadAssetResult,
	UpsertEntryInput,
	WriteImageAssetsInput,
	WriteMode,
	Writer,
	WrittenImageAssets,
} from "./types";
export { createWriteMode } from "./write-mode";
