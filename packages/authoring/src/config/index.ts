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
	EditorPropsArg,
	EmptyComponents,
	FieldControl,
	FieldEditorProps,
	FieldError,
	FieldIcon,
	FieldKind,
	ShellCompatibleEditor,
	ShellCompatibleWrapper,
	ShellOwnedKey,
} from "./contracts";
export { createFieldControl, SHELL_OWNED_KEYS } from "./contracts";
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
