/**
 * Basic theme + CMS field components (i18n locale switcher).
 * textareaWidget still registers via `@sjsf/basic-theme/extra-widgets/textarea-include`.
 */
import { theme as basicTheme } from "@sjsf/basic-theme";
import { extendByRecord } from "@sjsf/form/lib/resolver";
import I18nField from "./I18nField.svelte";

export const theme = extendByRecord(basicTheme, {
	i18nField: I18nField,
});
