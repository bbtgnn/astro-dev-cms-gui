/**
 * @cms/crud — CMS protocol + Writer injection. Filesystem write-back is
 * implementation behind createCmsProtocol / createCmsHost (ADR-0005).
 */

export type {
	AdaptProtocolOptions,
	CmsHost,
	CreateCmsHostOptions,
	CreateCmsProtocolOptions,
} from "./create-cms-protocol";
export {
	createCmsHost,
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
	CmsAssetsCapability,
	CmsCapabilities,
	CmsCapabilitiesInput,
	CmsErr,
	CmsOk,
	CmsProtocol,
	CmsResult,
	DeleteEntryFailureCode,
	DeleteEntryResult,
	EntryIdentity,
	GetCapabilitiesResult,
	GetEntryFailureCode,
	GetEntryResult,
	ListCollectionsResult,
	ListEntriesResult,
	SaveEntryFailureCode,
	SaveEntryResult,
	UploadImageFailureCode,
	UploadImageInput,
	UploadImageResult,
} from "./protocol";
export {
	CMS_ERR_DEFAULT_MESSAGE,
	cmsErr,
	cmsOk,
	DEFAULT_CMS_ASSETS_CAPABILITY,
	DEFAULT_CMS_CAPABILITIES,
	DELETE_ENTRY_FAILURE_CODES,
	defaultMessageForCmsErr,
	GET_ENTRY_FAILURE_CODES,
	httpStatusForCmsErr,
	isAllowedCmsFailureCode,
	legacyStatusMapForCodes,
	resolveCmsCapabilities,
	SAVE_ENTRY_FAILURE_CODES,
	UPLOAD_IMAGE_FAILURE_CODES,
} from "./protocol";
export { opaqueRevision } from "./revision";
export type {
	CollectionSummary,
	ContentEntry,
	ReadAssetResult,
	UpsertEntryInput,
	WriteImageAssetsInput,
	Writer,
	WrittenImageAssets,
} from "./types";
