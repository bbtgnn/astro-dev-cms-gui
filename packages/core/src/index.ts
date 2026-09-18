/**
 * @cms/core — field schemas, CMS protocol, and FS write-back adapters.
 * Filesystem write-back sits behind createCmsProtocol / createCmsHost (ADR-0005).
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
	scanEntryIds,
	withLoaderPathHint,
} from "./discovery";
export { parseEntryFile, serializeEntryFile } from "./entry-file";
export {
	type CmsFetchClient,
	CmsFetchError,
	createFetchClient,
	isCmsFetchError,
} from "./fetch-client";
/** Field schemas / FieldUi (Svelte-free). */
export {
	array,
	type BlockDefinition,
	type BlocksLayoutItem,
	type BlocksLayoutOptions,
	type BuiltInWidget,
	blocksLayout,
	boolean,
	type CollectionConfig,
	config,
	contentAssetPath,
	date,
	datetime,
	enumeration,
	type FieldMeta,
	type FieldUi,
	type FieldUiOptions,
	type FieldUiRegistryEntry,
	field,
	fieldUiFromOptions,
	fieldUiRegistry,
	getFieldUiDefault,
	type I18nOptions,
	type ImageOptions,
	i18n,
	image,
	imageFolderFromCanonical,
	isFieldUi,
	isUiComponent,
	markdown,
	number,
	object,
	type ResolvedBlock,
	type ResolveLocaleOptions,
	readFieldMeta,
	reference,
	registerFieldUi,
	resolveBlock,
	resolveFieldUi,
	resolveLocale,
	type SamplePostsInput,
	samplePostsSchema,
	select,
	string,
	stripUiFromJsonSchema,
	text,
	toFormSchemas,
	toJsonSchema,
	toUiSchema,
	type UiSchemaNode,
	withFieldUi,
	z,
} from "./fields";
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
