/**
 * Walk materialized Zod (CMS Input) → TypeScript type source + field kinds.
 * Stamped image/ref → CmsImage / CmsReference<"collection">.
 */

import type { ContentFieldStamp } from "../content-proxy/stamp-helpers";
import { getContentFieldStamp } from "../content-proxy/stamp-helpers";

type CmsMeta = { cms?: { kind?: string; collection?: string } };

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
	readonly meta?: (() => unknown) | unknown;
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

function readStamp(schema: unknown): ContentFieldStamp | undefined {
	const fromSymbol = getContentFieldStamp(schema);
	if (fromSymbol) return fromSymbol;
	if (!schema || typeof schema !== "object") return undefined;
	const node = schema as ZodWalkNode;
	let meta: unknown = node.meta;
	if (typeof meta === "function") {
		try {
			meta = meta.call(schema);
		} catch {
			meta = undefined;
		}
	}
	const cms = (meta as CmsMeta | undefined)?.cms;
	if (cms?.kind === "image") return { kind: "image" };
	if (cms?.kind === "reference" && typeof cms.collection === "string") {
		return { kind: "reference", collection: cms.collection };
	}
	return undefined;
}

function unwrapZod(schema: unknown): {
	inner: unknown;
	optional: boolean;
	nullable: boolean;
	stamp: ContentFieldStamp | undefined;
} {
	let optional = false;
	let nullable = false;
	let stamp = readStamp(schema);
	let current: unknown = schema;

	for (let i = 0; i < 8; i++) {
		if (!current || typeof current !== "object") break;
		const node = current as ZodWalkNode;
		stamp = stamp ?? readStamp(current);
		const t = node.type ?? node.def?.type;
		if (t === "optional" && typeof node.unwrap === "function") {
			optional = true;
			current = node.unwrap();
			continue;
		}
		if (t === "nullable" && typeof node.unwrap === "function") {
			nullable = true;
			current = node.unwrap();
			continue;
		}
		if (t === "default" && typeof node.unwrap === "function") {
			// Input: key optional when defaulted
			optional = true;
			current = node.unwrap();
			continue;
		}
		break;
	}

	stamp = stamp ?? readStamp(current);
	return { inner: current, optional, nullable, stamp };
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
			const opt = unwrapZod(child).optional ? "?" : "";
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
	const { optional, nullable } = unwrapZod(schema);
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
