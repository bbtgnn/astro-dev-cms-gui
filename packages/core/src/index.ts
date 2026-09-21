/**
 * @cms/core — CMS protocol, FS write-back adapters, and semantic IR.
 * Filesystem write-back sits behind createCmsProtocol / createCmsHost (ADR-0005).
 * Editor configuration is CMS-first IR only (ADR-0019) — no FieldUi-on-Zod.
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
export type { CollectionConfig, DiscoveredCollection } from "./discovery";
export { scanEntryIds } from "./discovery";
export { parseEntryFile, serializeEntryFile } from "./entry-file";
export {
	type CmsFetchClient,
	CmsFetchError,
	createFetchClient,
	isCmsFetchError,
} from "./fetch-client";
export { contentAssetPath, imageFolderFromCanonical } from "./image-path";
export { memoryWriter } from "./memory-writer";
export { nodeFsWriter } from "./node-fs-writer";
export type {
	EntryExtension,
	ResolvedEntry,
	ResolveEntryOptions,
} from "./path-resolve";
export {
	applyPathTemplate,
	assertSafeEntryId,
	DEFAULT_ENTRY_EXTENSION,
	entryRelPath,
	idFromRelPath,
	resolveEntryPath,
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
