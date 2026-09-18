import type { z } from "zod";
import { getFieldUiDefault } from "./registry";
import type {
	CollectionConfig,
	FieldMeta,
	FieldUi,
	FieldUiOptions,
} from "./types";

/** Collection chrome helper — use on root schema: `z.object({...}).meta(config({ label }))`. */
export function config(meta: CollectionConfig): FieldMeta {
	return { config: meta };
}

export function isFieldUi(value: unknown): value is FieldUi {
	return (
		typeof value === "object" &&
		value !== null &&
		"widget" in value &&
		typeof (value as FieldUi).widget === "string"
	);
}

/** True when `ui` is a direct component / binding override (not a FieldUi descriptor). */
export function isUiComponent(ui: unknown): boolean {
	if (ui == null) return false;
	if (isFieldUi(ui)) return false;
	return typeof ui === "function" || typeof ui === "object";
}

type ZodLike = z.ZodType & {
	meta: (metadata?: FieldMeta) => FieldMeta | undefined;
	_zod?: { def?: { type?: string; innerType?: ZodLike } };
};

/** Walk wrappers (default/optional/…) and return the first non-empty `.meta()`. */
export function readFieldMeta(schema: z.ZodType): FieldMeta | undefined {
	let current: ZodLike | undefined = schema as ZodLike;
	for (let i = 0; i < 12 && current; i++) {
		const meta =
			typeof current.meta === "function"
				? (current.meta() as FieldMeta | undefined)
				: undefined;
		if (meta && Object.keys(meta).length > 0) return meta;
		current = current._zod?.def?.innerType;
	}
	return undefined;
}

export function resolveFieldUi(meta: FieldMeta | undefined): {
	fieldUi?: FieldUi;
	component?: unknown;
	registry?: ReturnType<typeof getFieldUiDefault>;
} {
	if (!meta?.ui) return {};
	if (isUiComponent(meta.ui)) {
		return { component: meta.ui };
	}
	if (isFieldUi(meta.ui)) {
		const registry = getFieldUiDefault(meta.ui.widget);
		return {
			fieldUi: meta.ui,
			component: registry?.component,
			registry,
		};
	}
	return {};
}

/** Attach FieldUi (and title from label) via `.meta()`. Prefer applying after `.default()`. */
export function withFieldUi<T extends z.ZodType>(
	schema: T,
	ui: FieldUi,
	extra?: Omit<FieldMeta, "ui">,
): T {
	const meta: FieldMeta = {
		...extra,
		ui,
		title: extra?.title ?? ui.label,
	};
	return schema.meta(meta) as T;
}

export function fieldUiFromOptions(
	widget: string,
	opts?: FieldUiOptions,
): FieldUi {
	const base = getFieldUiDefault(widget);
	const options = {
		...base?.options,
		...opts?.options,
	};
	const fieldUi: FieldUi = { widget };
	if (opts?.label !== undefined) fieldUi.label = opts.label;
	if (Object.keys(options).length > 0) fieldUi.options = options;
	return fieldUi;
}
