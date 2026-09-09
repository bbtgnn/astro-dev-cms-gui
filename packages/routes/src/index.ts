/**
 * @cms/routes — consumer install root.
 * Dispatcher + middleware / integration seam + light fields barrel + discovery.
 */

/** Discovery + write-mode helpers (implemented in @cms/crud). */
export type {
	CollectionSummary,
	DiscoverCollectionsOptions,
	DiscoveredCollection,
	LoaderPathHint,
} from "@cms/crud";
export {
	CMS_LOADER_HINT,
	discoverCollections,
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
	date,
	datetime,
	enumeration,
	type FieldMeta,
	type FieldUi,
	field,
	fieldUiRegistry,
	type I18nOptions,
	i18n,
	image,
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
