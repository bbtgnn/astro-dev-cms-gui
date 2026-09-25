/**
 * @cms/core — CMS protocol, FS write-back adapters, and schema→form projection.
 * Filesystem write-back sits behind createCmsHost (ADR-0005).
 * Schema-first exploration: stamped Zod + form-tree builders (field refs + layout).
 * CMS-first IR authoring face is stripped on this branch.
 */

export type {
	CmsCollectionBuilt,
	CmsCollectionOptions,
	CmsCollectionType,
	CmsFile,
	CmsHelpers,
	CmsImage,
	CmsReference,
	CollectionLocation,
	DefineCmsResult,
	FormBuilderFor,
} from "./define-cms/define-cms";
export { defineCms } from "./define-cms/define-cms";
export type {
	FieldFn,
	FieldRefBuilder,
	FormTree,
	FormTreeColumnsNode,
	FormTreeFieldChrome,
	FormTreeFieldNode,
	FormTreeGroupNode,
	FormTreeHelpers,
	FormTreeKindHint,
	FormTreeNode,
	FormTreeTabEntry,
	FormTreeTabsNode,
	ObjectInputOf,
	ScopedFormTreeHelpers,
} from "./form-tree/form-tree";
export {
	createFormTreeHelpers,
	createScopedFormTreeHelpers,
} from "./form-tree/form-tree";
export type {
	CmsDispatcherOptions,
	CreateCmsHttpFromConfigOptions,
	CreateCmsHttpFromConfigResult,
} from "./http";
export {
	cmsDevOnlyGuard,
	createCmsDispatcher,
	createCmsHttpFromConfig,
	DEFAULT_CMS_API_MOUNT,
} from "./http";
export type {
	AdaptProtocolOptions,
	CmsHost,
	CreateCmsHostConfig,
	CreateCmsHostFromCollections,
	CreateCmsHostFromCollectionsOptions,
	CreateCmsHostFromConfig,
	CreateCmsHostFromConfigOptions,
	CreateCmsHostOptions,
	CreateCmsProtocolOptions,
} from "./protocol/create-cms-protocol";
export { createCmsHost } from "./protocol/create-cms-protocol";
export {
	type CmsFetchClient,
	CmsFetchError,
	createFetchClient,
	isCmsFetchError,
} from "./protocol/fetch-client";
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
} from "./protocol/protocol";
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
} from "./protocol/protocol";
export { opaqueRevision } from "./protocol/revision";
export type {
	CollectionConfig,
	CollectionDescriptor,
} from "./writer/collection-descriptors";
export { scanEntryIds } from "./writer/collection-descriptors";
export { parseEntryFile, serializeEntryFile } from "./writer/entry-file";
export {
	contentAssetPath,
	imageFolderFromCanonical,
} from "./writer/image-path";
export { memoryWriter } from "./writer/memory-writer";
export { nodeFsWriter } from "./writer/node-fs-writer";
export type {
	EntryExtension,
	ResolvedEntry,
	ResolveEntryOptions,
} from "./writer/path-resolve";
export {
	applyPathTemplate,
	assertSafeEntryId,
	DEFAULT_ENTRY_EXTENSION,
	entryRelPath,
	idFromRelPath,
	resolveEntryPath,
	writerExists,
} from "./writer/path-resolve";
export type {
	CollectionSummary,
	ContentEntry,
	ReadAssetResult,
	UpsertEntryInput,
	WriteImageAssetsInput,
	Writer,
	WrittenImageAssets,
} from "./writer/types";
