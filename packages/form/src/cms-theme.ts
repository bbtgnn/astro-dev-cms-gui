/**
 * Basic theme + CMS field components (i18n, blocks, image).
 * textareaWidget still registers via `@sjsf/basic-theme/extra-widgets/textarea-include`.
 */
import { theme as basicTheme } from "@sjsf/basic-theme";
import { extendByRecord } from "@sjsf/form/lib/resolver";
import BlocksLayoutField from "./BlocksLayoutField.svelte";
import I18nField from "./I18nField.svelte";
import ImageField from "./ImageField.svelte";

export const theme = extendByRecord(basicTheme, {
	blocksLayoutField: BlocksLayoutField,
	i18nField: I18nField,
	imageField: ImageField,
});
