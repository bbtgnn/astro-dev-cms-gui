/**
 * Test / non-convention escapes for `@cms/astro`.
 *
 * Prefer zero-arg `cms()` from `@cms/astro` for real hosts.
 * Use this module only in fixtures and advanced layouts.
 */
export {
	type CmsHarnessOptions,
	type CmsIntegration,
	cmsHarness,
	createCmsIntegration,
} from "./integration";
