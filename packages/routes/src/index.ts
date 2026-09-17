/**
 * @cms/routes — consumer install root.
 * Dispatcher + middleware / integration seam + light fields barrel + discovery.
 */

/** Discovery + write-mode helpers (implemented in @cms/crud). */
export type {
	CmsProtocol,
	CollectionSummary,
	ContentEntry,
	DiscoverCollectionsOptions,
	DiscoveredCollection,
	EntryIdentity,
	LoaderPathHint,
} from "@cms/crud";
export {
	adaptWriteModeToProtocol,
	CMS_LOADER_HINT,
	createCmsProtocol,
	discoverCollections,
	httpStatusForCmsErr,
	resolveCollectionSchema,
	scanYamlEntryIds,
	withLoaderPathHint,
} from "@cms/crud";
/** Light re-export of authoring builders / FieldUi (implemented in @cms/fields). */
export {
	array,
	type BlockDefinition,
	type BlocksLayoutItem,
	type BlocksLayoutOptions,
	blocksLayout,
	boolean,
	type CollectionConfig,
	config,
	contentAssetPath,
	DEFAULT_IMAGE_SRCSET_WIDTHS,
	date,
	datetime,
	enumeration,
	type FieldMeta,
	type FieldUi,
	field,
	fieldUiRegistry,
	formatSrcset,
	type I18nOptions,
	type ImageSrcsetItem,
	i18n,
	image,
	imageFolderFromCanonical,
	markdown,
	number,
	object,
	type PrototypePostsInput,
	prototypePostsSchema,
	type ResolvedBlock,
	type ResolveLocaleOptions,
	reference,
	registerFieldUi,
	resolveBlock,
	resolveImageSrcsetItems,
	resolveLocale,
	select,
	string,
	text,
	toFormSchemas,
	toJsonSchema,
	toUiSchema,
	z,
} from "@cms/fields";
export {
	type AdaptImageOptions,
	type AdaptReferenceOptions,
	adaptImage,
	adaptReference,
} from "./adapt";
export { cmsDevOnlyGuard } from "./dev-guard";
export {
	type CmsDispatcherOptions,
	createCmsDispatcher,
} from "./dispatcher";
export {
	type CmsIntegration,
	type CmsMiddlewareContext,
	type CmsMiddlewareHandler,
	type CmsMiddlewareNext,
	createCmsIntegration,
	createCmsMiddleware,
} from "./middleware";
export {
	DEFAULT_IMAGE_WIDTHS,
	DEFAULT_WEBP_QUALITY,
	type ProcessedImageFile,
	type ProcessImageOptions,
	processImageToWebpSizes,
} from "./process-image";
