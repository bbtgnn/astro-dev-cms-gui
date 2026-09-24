/**
 * Schema-first semantic face: kinds, form-model types, schema→form projection,
 * and stamped Zod → persisted-Input rewrite.
 *
 * Primary seams: `projectSchemaFormModel(s)` and `toPersistedInputSchema`.
 * No CMS-first IR builders / compile / IR→form projections on this branch.
 */

export {
	attachContentFieldStamp,
	CONTENT_FIELD_STAMP,
	type ContentFieldStamp,
	type ContentFieldStampMeta,
	readContentFieldStamp,
	stampContentFieldLeaf,
	unwrapZod,
} from "./content-field-stamp";
export type {
	CollectionFormModel,
	FormConstraintSummary,
	FormFieldDescriptor,
	FormLayoutArray,
	FormLayoutColumn,
	FormLayoutColumns,
	FormLayoutFieldRef,
	FormLayoutGroup,
	FormLayoutHeader,
	FormLayoutNode,
	FormLayoutObject,
	FormLayoutSeparator,
	FormLayoutStack,
	FormLayoutTab,
	FormLayoutTabs,
	FormLayoutUnion,
	FormLayoutUnionVariant,
	FormModelsByCollection,
} from "./form-model";
export {
	type InputValidatorDeps,
	toPersistedInputSchema,
} from "./persisted-input-rewrite";
export {
	type ProjectSchemaFormModelsOptions,
	type ProjectSchemaFormOptions,
	projectSchemaFormModel,
	projectSchemaFormModels,
} from "./schema-form-projection";
export type {
	NumberConstraint,
	OpaqueBinding,
	OpaqueProps,
	ScalarConstraint,
	SemanticKind,
	StringConstraint,
} from "./types";
