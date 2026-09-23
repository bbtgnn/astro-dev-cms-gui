/**
 * Host-only content-proxy: stamp Astro `glob`/`file` location options and
 * `reference` / function-schema `image` kinds without changing user import paths.
 *
 * Product `cms()` installs {@link vitePluginsForBoot} + {@link viteAliasesForBoot}
 * in `astro:config:setup` before Content Layer evaluates `content.config`.
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
