/**
 * Authoring config facade — Svelte contracts + typed unified-tree builders
 * (ADR-0019 slice 2). Import from `@cms/authoring/config`.
 */

export {
	type CmsBuilders,
	type CmsConfigInput,
	createCmsBuilders,
} from "./builders";
export type {
	AggregateWrapperProps,
	AnySvelteComponent,
	CompatibleIconKey,
	CompatibleKey,
	CompatibleWrapperKey,
	ComponentsCatalog,
	EditorExtraProps,
	EmptyComponents,
	FieldControl,
	FieldEditorProps,
	FieldError,
	FieldIcon,
	FieldKind,
	EditorPropsArg,
	ShellCompatibleEditor,
	ShellCompatibleWrapper,
	ShellOwnedKey,
} from "./contracts";
export { SHELL_OWNED_KEYS, createFieldControl } from "./contracts";
export type {
	AnyTypedSchema,
	IdOfNode,
	InputOfNode,
	InputOfSchema,
	KindOfSchema,
	ShapeOfContent,
	TypedArrayNode,
	TypedDurableNode,
	TypedFieldNode,
	TypedObjectNode,
	TypedSchema,
	TypedTreeNode,
	TypedUnionNode,
	WithInput,
} from "./infer";
