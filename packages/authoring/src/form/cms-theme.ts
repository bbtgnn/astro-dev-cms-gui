/**
 * Basic theme + CMS FieldEditorProps stock editors (bridged for SJSF).
 * textareaWidget still registers via `@sjsf/basic-theme/extra-widgets/textarea-include`.
 */
import { theme as basicTheme } from "@sjsf/basic-theme";
import { extendByRecord } from "@sjsf/form/lib/resolver";
import BlocksLayoutField from "./BlocksLayoutField.svelte";
import I18nField from "./I18nField.svelte";
import ImageField from "./ImageField.svelte";
import BooleanField from "./stock/BooleanField.svelte";
import DiscriminatedUnionField from "./stock/DiscriminatedUnionField.svelte";
import EnumField from "./stock/EnumField.svelte";
import LiteralField from "./stock/LiteralField.svelte";
import NumberField from "./stock/NumberField.svelte";
import ReferenceField from "./stock/ReferenceField.svelte";
import StringField from "./stock/StringField.svelte";
import { wrapFieldEditorForSjsf } from "./wrap-field-editor";

export const theme = extendByRecord(basicTheme, {
	textWidget: wrapFieldEditorForSjsf(StringField),
	numberWidget: wrapFieldEditorForSjsf(NumberField),
	checkboxWidget: wrapFieldEditorForSjsf(BooleanField),
	selectWidget: wrapFieldEditorForSjsf(EnumField),
	blocksLayoutField: BlocksLayoutField,
	i18nField: I18nField,
	imageField: wrapFieldEditorForSjsf(ImageField),
	referenceField: wrapFieldEditorForSjsf(ReferenceField),
	literalField: wrapFieldEditorForSjsf(LiteralField),
	discriminatedUnionField: wrapFieldEditorForSjsf(DiscriminatedUnionField),
});
