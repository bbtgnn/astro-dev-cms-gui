/**
 * Bind a FieldEditorProps editor into an SJSF widget slot (ADR-0011 internal).
 * Authors and stock editors target FieldEditorProps; this wrapper is shell-only.
 */

import type { AnySvelteComponent } from "../config/contracts";
import SjsfFieldEditorBridge from "./sjsf-field-editor-bridge.svelte";

export type WrapFieldEditorOptions = {
	readonly editorProps?: Record<string, unknown>;
};

/**
 * Inject editor props without object-spreading the widget props bag.
 *
 * Svelte 5 `bind:value` is implemented as get/set accessors on `props`.
 * `{ ...props }` snapshots `value` into a plain data property, so later
 * `value = next` inside the bridge never reaches SJSF form state.
 */
export function injectEditorIntoWidgetProps(
	props: Record<string, unknown>,
	editor: AnySvelteComponent,
	editorProps?: Record<string, unknown>,
): Record<string, unknown> {
	const next = Object.create(
		Object.getPrototypeOf(props),
		Object.getOwnPropertyDescriptors(props),
	) as Record<string, unknown>;
	next.editor = editor;
	if (editorProps !== undefined) {
		next.editorProps = editorProps;
	}
	return next;
}

/**
 * Return an SJSF-compatible widget component that adapts WidgetCommonProps →
 * FieldEditorProps and renders `editor`.
 */
export function wrapFieldEditorForSjsf(
	editor: AnySvelteComponent,
	options?: WrapFieldEditorOptions,
): AnySvelteComponent {
	const editorProps = options?.editorProps;
	const Wrapped = ((internals: unknown, props: Record<string, unknown>) =>
		SjsfFieldEditorBridge(
			internals as never,
			injectEditorIntoWidgetProps(props, editor, editorProps) as never,
		)) as AnySvelteComponent;
	return Wrapped;
}
