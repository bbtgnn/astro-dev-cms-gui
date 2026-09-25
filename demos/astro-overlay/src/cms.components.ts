/**
 * Vite-only live Svelte catalog for cms.config binding keys.
 *
 * Convention: `src/cms.components.ts`. Loaded as `virtual:@cms/components`.
 * Never import this module from Node / cms.config.ts value space.
 */
import AuthorNameEditor from "./cms/fields/author-name-editor.svelte";

export default {
	AuthorNameEditor,
};
