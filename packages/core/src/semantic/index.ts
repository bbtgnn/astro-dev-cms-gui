/**
 * Schema-first semantic face: kinds, form-model types, and schema→form projection.
 *
 * Primary seam: `projectSchemaFormModel` / `projectSchemaFormModels`.
 * No CMS-first IR builders / compile / IR→form projections on this branch.
 */

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
	attachContentFieldStamp,
	CONTENT_FIELD_STAMP,
	type ContentFieldStamp,
	type ContentFieldStampMeta,
	readContentFieldStamp,
	stampContentFieldLeaf,
	unwrapZod,
} from "./content-field-stamp";
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
