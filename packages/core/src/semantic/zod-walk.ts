/**
 * Tiny Zod graph accessors shared by form projection, Input rewrite, and codegen.
 * Not a walk engine — peers keep separate walks (ADR-0024).
 */

export type ZodWalkNode = {
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

export function zodObjectShape(
	schema: unknown,
): Record<string, unknown> | undefined {
	if (!schema || typeof schema !== "object") return undefined;
	const node = schema as ZodWalkNode;
	if (node.shape && typeof node.shape === "object") return node.shape;
	if (node.def?.shape && typeof node.def.shape === "object") {
		return node.def.shape;
	}
	if (node.def?.entries && typeof node.def.entries === "object") {
		return node.def.entries;
	}
	return undefined;
}

export function zodArrayElement(schema: unknown): unknown {
	if (!schema || typeof schema !== "object") return undefined;
	const node = schema as ZodWalkNode;
	if (node.element !== undefined) return node.element;
	if (node.def?.element !== undefined) return node.def.element;
	return undefined;
}
