/**
 * Walk materialized Zod (CMS Input) → TypeScript type source + field kinds.
 * Stamped image/ref → CmsImage / CmsReference<"collection">.
 */

import { unwrapZod } from "@cms/core/semantic";

type ZodWalkNode = {
	readonly type?: string;
	readonly unwrap?: () => unknown;
	readonly shape?: Record<string, unknown>;
	readonly element?: unknown;
	readonly options?: readonly unknown[];
	readonly def?: {
		readonly type?: string;
		readonly innerType?: unknown;
		readonly defaultValue?: unknown;
		readonly element?: unknown;
		readonly shape?: Record<string, unknown>;
		readonly entries?: Record<string, unknown>;
		readonly options?: readonly unknown[];
	};
};

export type PrintedFieldKind =
	| { readonly kind: "image" }
	| { readonly kind: "reference"; readonly collection: string }
	| { readonly kind: "object" }
	| { readonly kind: "array" }
	| { readonly kind: "scalar" };

export type PrintedTypeTree = {
	/** TypeScript type expression (no trailing `;`). */
	readonly typeSource: string;
	readonly fieldKind: PrintedFieldKind;
	/** Nested kinds for object fields (codegen CmsFieldKinds). */
	readonly fields?: Readonly<Record<string, PrintedTypeTree>>;
};

/** Input optionality: `.optional()` or `.default()` (defaulted keys are optional on Input). */
function isInputOptional(schema: unknown): boolean {
	const { optional, defaultValue } = unwrapZod(schema);
	return optional || defaultValue !== undefined;
}

function objectShape(node: ZodWalkNode): Record<string, unknown> | undefined {
	if (node.shape && typeof node.shape === "object") return node.shape;
	if (node.def?.shape && typeof node.def.shape === "object")
		return node.def.shape;
	if (node.def?.entries && typeof node.def.entries === "object") {
		return node.def.entries;
	}
	return undefined;
}

function arrayElement(node: ZodWalkNode): unknown {
	if (node.element !== undefined) return node.element;
	if (node.def?.element !== undefined) return node.def.element;
	return undefined;
}

function printInner(schema: unknown): PrintedTypeTree {
	const { inner, stamp } = unwrapZod(schema);

	if (stamp?.kind === "image") {
		return { typeSource: "CmsImage", fieldKind: { kind: "image" } };
	}
	if (stamp?.kind === "reference") {
		const col = JSON.stringify(stamp.collection);
		return {
			typeSource: `CmsReference<${col}>`,
			fieldKind: { kind: "reference", collection: stamp.collection },
		};
	}

	if (!inner || typeof inner !== "object") {
		return { typeSource: "unknown", fieldKind: { kind: "scalar" } };
	}

	const node = inner as ZodWalkNode;
	const t = node.type ?? node.def?.type;

	if (t === "object") {
		const shape = objectShape(node) ?? {};
		const fields: Record<string, PrintedTypeTree> = {};
		const lines: string[] = [];
		for (const [key, child] of Object.entries(shape)) {
			const printed = printZodInputType(child);
			fields[key] = printed;
			const opt = isInputOptional(child) ? "?" : "";
			lines.push(`\t\t${JSON.stringify(key)}${opt}: ${printed.typeSource};`);
		}
		return {
			typeSource:
				lines.length === 0
					? "Record<string, never>"
					: `{\n${lines.join("\n")}\n\t}`,
			fieldKind: { kind: "object" },
			fields,
		};
	}

	if (t === "array") {
		const el = arrayElement(node);
		const printed =
			el !== undefined
				? printInner(el)
				: {
						typeSource: "unknown",
						fieldKind: { kind: "scalar" as const },
					};
		return {
			typeSource: `ReadonlyArray<${printed.typeSource}>`,
			fieldKind: { kind: "array" },
			fields: printed.fields,
		};
	}

	if (t === "string" || t === "boolean" || t === "number" || t === "bigint") {
		return {
			typeSource: t === "bigint" ? "bigint" : t,
			fieldKind: { kind: "scalar" },
		};
	}

	if (t === "literal") {
		return {
			typeSource: "string | number | boolean",
			fieldKind: { kind: "scalar" },
		};
	}

	if (t === "enum" || t === "union") {
		return { typeSource: "string", fieldKind: { kind: "scalar" } };
	}

	return { typeSource: "unknown", fieldKind: { kind: "scalar" } };
}

/** Print CMS Input type for a materialized Zod schema. */
export function printZodInputType(schema: unknown): PrintedTypeTree {
	const optional = isInputOptional(schema);
	const { nullable } = unwrapZod(schema);
	const inner = printInner(schema);
	let typeSource = inner.typeSource;
	if (nullable) typeSource = `${typeSource} | null`;
	if (optional) {
		// Optionality is expressed on the object property (`key?:`), not `| undefined`
		// when used as a field. For top-level / array elements keep `| undefined`.
	}
	return {
		...inner,
		typeSource,
		...(optional ? { optional: true } : {}),
	} as PrintedTypeTree & { optional?: boolean };
}

export type CollectionTypePrint = {
	readonly name: string;
	readonly data: PrintedTypeTree;
};

/** Print kinds map entries for one collection's object fields. */
export function printFieldKindsObject(
	fields: Readonly<Record<string, PrintedTypeTree>> | undefined,
	indent: string,
): string {
	if (!fields || Object.keys(fields).length === 0) {
		return "Record<string, never>";
	}
	const lines: string[] = [];
	for (const [key, tree] of Object.entries(fields)) {
		const k = tree.fieldKind;
		let kindSrc: string;
		if (k.kind === "image") kindSrc = '"image"';
		else if (k.kind === "reference") {
			kindSrc = `{ kind: "reference"; collection: ${JSON.stringify(k.collection)} }`;
		} else if (k.kind === "object" && tree.fields) {
			kindSrc = printFieldKindsObject(tree.fields, `${indent}\t`);
		} else {
			kindSrc = `"${k.kind}"`;
		}
		lines.push(`${indent}${JSON.stringify(key)}: ${kindSrc};`);
	}
	return `{\n${lines.join("\n")}\n${indent.slice(0, -1)}}`;
}
