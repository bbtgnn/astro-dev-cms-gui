/**
 * Bind a FieldEditorProps editor into an SJSF widget slot (ADR-0011 internal).
 * Authors and stock editors target FieldEditorProps; this wrapper is shell-only.
 */

import type { AnySvelteComponent } from "../config/contracts";
import SjsfFieldEditorBridge from "./SjsfFieldEditorBridge.svelte";

export type WrapFieldEditorOptions = {
	readonly editorProps?: Record<string, unknown>;
};

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
		SjsfFieldEditorBridge(internals as never, {
			...props,
			editor,
			...(editorProps !== undefined ? { editorProps } : {}),
		} as never)) as AnySvelteComponent;
	return Wrapped;
}
