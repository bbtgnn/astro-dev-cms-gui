/**
 * Host-only content-proxy: stamp Astro `glob`/`file` location options and
 * `reference` / function-schema `image` kinds without changing user import paths.
 *
 * Wire into product `cms()` later (schema-first overlay ticket 05). Until then,
 * hosts may call {@link vitePluginsForBoot} + {@link viteAliasesForBoot} manually.
 *
 * Never import this module (or `content.config`) from the browser authoring shell.
 */

export {
	astroContentBootProxy,
	viteAliasesForBoot,
	vitePluginsForBoot,
} from "./boot";
export {
	CONTENT_FIELD_STAMP,
	type ContentFieldStamp,
	type ImageFieldStamp,
	type ReferenceFieldStamp,
	getContentFieldStamp,
	imageFieldMeta,
	relationFieldMeta,
	stampImageSchema,
	stampRelationSchema,
} from "./stamp-helpers";
export {
	LOADER_STAMP,
	type FileLoaderStamp,
	type GlobLoaderStamp,
	type LoaderStamp,
	type StampedLoader,
	getLoaderStamp,
	stampLoader,
} from "./stamps";
