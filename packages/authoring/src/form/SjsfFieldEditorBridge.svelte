<!--
  Internal SJSF ↔ FieldEditorProps adapter (ADR-0011).
  Not the public editor contract — authors implement FieldEditorProps only.
-->
<script lang="ts">
	import {
		type FormEnumOption,
		getFormContext,
		uiTitleOption,
	} from "@sjsf/form";
	import type { Component } from "svelte";
	import {
		createFieldControl,
		type FieldEditorProps,
		type FieldError,
		type FieldKind,
	} from "../config/contracts";

	type BridgeProps = {
		type?: string;
		config: {
			title: string;
			uiSchema?: Record<string, unknown>;
			path?: unknown;
		};
		value?: unknown;
		handlers?: {
			onblur?: () => void;
			oninput?: () => void;
			onchange?: () => void;
		};
		errors?: readonly string[];
		uiOption?: unknown;
		options?: FormEnumOption[];
		editor: Component<FieldEditorProps<unknown, FieldKind>>;
		editorProps?: Record<string, unknown>;
	};

	let {
		value = $bindable(),
		config,
		handlers,
		errors = [],
		options,
		editor,
		editorProps,
	}: BridgeProps = $props();

	const ctx = getFormContext();

	const label = $derived(
		uiTitleOption(ctx, config.uiSchema as never) ?? config.title ?? "",
	);

	const description = $derived.by(() => {
		const ui = config.uiSchema;
		if (!ui || typeof ui !== "object") return undefined;
		const direct = ui["ui:description"];
		if (typeof direct === "string" && direct.length > 0) return direct;
		const opts = ui["ui:options"];
		if (opts && typeof opts === "object" && "description" in opts) {
			const d = (opts as { description?: unknown }).description;
			if (typeof d === "string" && d.length > 0) return d;
		}
		return undefined;
	});

	const fieldErrors = $derived.by((): readonly FieldError[] =>
		(errors ?? []).map((message) => ({ message })),
	);

	const field = createFieldControl<unknown, FieldKind>({
		getValue: () => value,
		setValue: (next) => {
			value = next;
			handlers?.oninput?.();
			handlers?.onchange?.();
		},
		getErrors: () => fieldErrors,
		// Form-level disable is internal to SJSF; field editors still honor this flag.
		getDisabled: () => false,
	});

	const Editor = $derived(editor);

	const enumOptions = $derived(
		(options ?? []).map((opt) => ({
			value: String(opt.value),
			label: opt.label,
			disabled: opt.disabled,
		})),
	);

	const extra = $derived.by(() => {
		const base = editorProps ?? {};
		if (options !== undefined) {
			return { ...base, options: enumOptions };
		}
		return base;
	});
</script>

<Editor {field} {label} description={description} {...extra} />
