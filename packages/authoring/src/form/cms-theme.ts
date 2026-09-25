/**
 * Basic theme + CMS FieldEditorProps stock editors (bridged for SJSF).
 */
import { theme as basicTheme } from "@sjsf/basic-theme";
import { extendByRecord } from "@sjsf/form/lib/resolver";
import ImageField from "./image-field.svelte";
import BooleanField from "./stock/boolean-field.svelte";
import DiscriminatedUnionField from "./stock/discriminated-union-field.svelte";
import EnumField from "./stock/enum-field.svelte";
import LiteralField from "./stock/literal-field.svelte";
import NumberField from "./stock/number-field.svelte";
import ReferenceField from "./stock/reference-field.svelte";
import StringField from "./stock/string-field.svelte";
import { wrapFieldEditorForSjsf } from "./wrap-field-editor";

export const theme = extendByRecord(basicTheme, {
	textWidget: wrapFieldEditorForSjsf(StringField),
	numberWidget: wrapFieldEditorForSjsf(NumberField),
	checkboxWidget: wrapFieldEditorForSjsf(BooleanField),
	selectWidget: wrapFieldEditorForSjsf(EnumField),
	imageField: wrapFieldEditorForSjsf(ImageField),
	referenceField: wrapFieldEditorForSjsf(ReferenceField),
	literalField: wrapFieldEditorForSjsf(LiteralField),
	discriminatedUnionField: wrapFieldEditorForSjsf(DiscriminatedUnionField),
});
