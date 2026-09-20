/**
 * Vite-only live Svelte catalog for `cms.config` binding keys (ADR-0019).
 *
 * Convention: `src/cms.components.ts`. Loaded as `virtual:@cms/components`.
 * Never import this module from Node generation / `cms.config.ts` value space.
 */
import AuthorNameEditor from "./cms/fields/AuthorNameEditor.svelte";
import BodyEditor from "./cms/fields/BodyEditor.svelte";

export default {
	AuthorNameEditor,
	BodyEditor,
};
