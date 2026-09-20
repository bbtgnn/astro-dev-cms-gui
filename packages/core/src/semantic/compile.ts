/**
 * Compile host-authored semantic trees into validated IR (ADR-0019).
 * All closed-algebra invariants live behind this seam.
 */

import {
	type ArrayNode,
	type CollectionNode,
	type DiscriminatedUnionNode,
	type FieldNode,
	isSemanticNode,
	type ObjectNode,
	type SchemaNode,
	type SemanticConfigInput,
	type TreeNode,
} from "./builders";
import { SemanticIrError, type SemanticIrIssue } from "./errors";
import type {
	CompiledSemanticIr,
	IrArray,
	IrCollection,
	IrDiscriminatedUnion,
	IrField,
	IrGlobLoader,
	IrObject,
	IrSchema,
	IrTreeNode,
	NumberConstraint,
	PersistedCollectionShape,
	PersistedConfigShape,
	PersistedDiscriminatedUnion,
	PersistedField,
	PersistedObject,
	PersistedSchema,
	SemanticKind,
	StringConstraint,
} from "./types";

const STRING_CONSTRAINT_METHODS = new Set(["min", "max", "regex"]);
const NUMBER_CONSTRAINT_METHODS = new Set(["min", "max", "int"]);

const PRESENTATION_TYPES = new Set([
	"tabs",
	"tab",
	"stack",
	"columns",
	"column",
	"group",
	"header",
	"separator",
]);

const DURABLE_TREE_TYPES = new Set([
	"field",
	"object",
	"array",
	"discriminatedUnion",
]);

type Ctx = {
	issues: SemanticIrIssue[];
	/** Full path keys seen for durable placements (e.g. `seo.title`). */
	seenPaths: Set<string>;
};

function issue(ctx: Ctx, code: string, message: string, path?: string): void {
	ctx.issues.push({ code, message, ...(path !== undefined ? { path } : {}) });
}

function joinPath(parent: string, id: string): string {
	return parent === "" ? id : `${parent}.${id}`;
}

function assertBranded(ctx: Ctx, value: unknown, where: string): boolean {
	if (!isSemanticNode(value)) {
		issue(
			ctx,
			"unknown_node",
			`Unsupported or unbranded node at ${where} (closed algebra; no Zod escape hatch)`,
			where,
		);
		return false;
	}
	return true;
}

function semanticKindOf(schema: SchemaNode): SemanticKind {
	let node: SchemaNode = schema;
	while (
		node.type === "optional" ||
		node.type === "nullable" ||
		node.type === "default"
	) {
		node = node.of;
	}
	switch (node.type) {
		case "string":
		case "number":
		case "boolean":
		case "literal":
		case "enum":
		case "image":
		case "reference":
		case "object":
		case "array":
		case "discriminatedUnion":
			return node.type;
		default: {
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
}

function validateStringConstraints(
	ctx: Ctx,
	constraints: readonly StringConstraint[],
	path: string,
): void {
	for (const c of constraints) {
		if (!STRING_CONSTRAINT_METHODS.has(c.method)) {
			issue(
				ctx,
				"unknown_constraint",
				`Unknown string constraint method "${(c as { method: string }).method}" (v1 allows min, max, regex)`,
				path,
			);
		}
	}
}

function validateNumberConstraints(
	ctx: Ctx,
	constraints: readonly NumberConstraint[],
	path: string,
): void {
	for (const c of constraints) {
		if (!NUMBER_CONSTRAINT_METHODS.has(c.method)) {
			issue(
				ctx,
				"unknown_constraint",
				`Unknown number constraint method "${(c as { method: string }).method}" (v1 allows min, max, int)`,
				path,
			);
		}
	}
}

function compileSchema(ctx: Ctx, schema: SchemaNode, path: string): IrSchema {
	if (!assertBranded(ctx, schema, path)) {
		// Placeholder so callers can continue collecting issues
		return { kind: "string", constraints: [] };
	}

	switch (schema.type) {
		case "string":
			validateStringConstraints(ctx, schema.constraints, path);
			return { kind: "string", constraints: [...schema.constraints] };
		case "number":
			validateNumberConstraints(ctx, schema.constraints, path);
			return { kind: "number", constraints: [...schema.constraints] };
		case "boolean":
			return { kind: "boolean" };
		case "literal":
			return { kind: "literal", value: schema.value };
		case "enum":
			return { kind: "enum", values: schema.values };
		case "image":
			return { kind: "image" };
		case "reference":
			return { kind: "reference", collection: schema.collection };
		case "optional":
			return { kind: "optional", of: compileSchema(ctx, schema.of, path) };
		case "nullable":
			return { kind: "nullable", of: compileSchema(ctx, schema.of, path) };
		case "default":
			return {
				kind: "default",
				of: compileSchema(ctx, schema.of, path),
				value: schema.value,
			};
		case "object":
			return compileObjectAsSchema(ctx, schema, path);
		case "array":
			return compileArrayAsSchema(ctx, schema, path);
		case "discriminatedUnion":
			return compileUnionAsSchema(ctx, schema, path);
		default: {
			issue(
				ctx,
				"unknown_node",
				`Unknown schema node type "${(schema as { type: string }).type}"`,
				path,
			);
			return { kind: "string", constraints: [] };
		}
	}
}

function registerDurablePath(ctx: Ctx, fullPath: string): void {
	if (ctx.seenPaths.has(fullPath)) {
		issue(
			ctx,
			"duplicate_path",
			`Duplicate path-local id placement "${fullPath}"`,
			fullPath,
		);
		return;
	}
	ctx.seenPaths.add(fullPath);
}

function assertContentArray(
	ctx: Ctx,
	content: unknown,
	where: string,
): content is readonly TreeNode[] {
	if (!Array.isArray(content)) {
		issue(
			ctx,
			"invalid_content",
			`Container at ${where} must have array children`,
			where,
		);
		return false;
	}
	return true;
}

function assertComponentWrapperExclusive(
	ctx: Ctx,
	node: { component?: unknown; wrapper?: unknown },
	path: string,
): void {
	if (node.component !== undefined && node.wrapper !== undefined) {
		issue(
			ctx,
			"component_wrapper_conflict",
			`component and wrapper are mutually exclusive at "${path}"`,
			path,
		);
	}
}

function compileObjectNode(
	ctx: Ctx,
	node: ObjectNode,
	parentPath: string,
): IrObject {
	const fullPath = joinPath(parentPath, node.id);
	registerDurablePath(ctx, fullPath);
	assertComponentWrapperExclusive(ctx, node, fullPath);
	if (!assertContentArray(ctx, node.content, fullPath)) {
		return {
			kind: "object",
			id: node.id,
			...(node.label !== undefined ? { label: node.label } : {}),
			content: [],
			semanticKind: "object",
		};
	}
	const content = node.content.map((child, i) =>
		compileTreeNode(ctx, child, fullPath, `${fullPath}[${i}]`),
	);
	return {
		kind: "object",
		id: node.id,
		...(node.label !== undefined ? { label: node.label } : {}),
		content,
		semanticKind: "object",
		...(node.component !== undefined ? { component: node.component } : {}),
		...(node.wrapper !== undefined ? { wrapper: node.wrapper } : {}),
		...(node.props !== undefined ? { props: node.props } : {}),
	};
}

function compileObjectAsSchema(
	ctx: Ctx,
	node: ObjectNode,
	parentPath: string,
): IrObject {
	return compileObjectNode(ctx, node, parentPath);
}

function compileArrayNode(
	ctx: Ctx,
	node: ArrayNode,
	parentPath: string,
): IrArray {
	const fullPath = joinPath(parentPath, node.id);
	registerDurablePath(ctx, fullPath);
	assertComponentWrapperExclusive(ctx, node, fullPath);
	return {
		kind: "array",
		id: node.id,
		...(node.label !== undefined ? { label: node.label } : {}),
		of: compileSchema(ctx, node.of, `${fullPath}[]`),
		semanticKind: "array",
		...(node.component !== undefined ? { component: node.component } : {}),
		...(node.wrapper !== undefined ? { wrapper: node.wrapper } : {}),
		...(node.props !== undefined ? { props: node.props } : {}),
	};
}

function compileArrayAsSchema(
	ctx: Ctx,
	node: ArrayNode,
	parentPath: string,
): IrArray {
	return compileArrayNode(ctx, node, parentPath);
}

function compileUnionNode(
	ctx: Ctx,
	node: DiscriminatedUnionNode,
	parentPath: string,
): IrDiscriminatedUnion {
	const fullPath = joinPath(parentPath, node.id);
	registerDurablePath(ctx, fullPath);

	if (!Array.isArray(node.variants)) {
		issue(
			ctx,
			"invalid_content",
			`discriminatedUnion variants must be an array at "${fullPath}"`,
			fullPath,
		);
		return {
			kind: "discriminatedUnion",
			id: node.id,
			discriminant: node.discriminant,
			variants: [],
			semanticKind: "discriminatedUnion",
		};
	}

	const variantIds = new Set<string>();
	const variants: IrObject[] = [];

	for (const variant of node.variants) {
		if (!assertBranded(ctx, variant, fullPath) || variant.type !== "object") {
			issue(
				ctx,
				"unknown_node",
				`discriminatedUnion variant must be an object node at "${fullPath}"`,
				fullPath,
			);
			continue;
		}
		if (variantIds.has(variant.id)) {
			issue(
				ctx,
				"duplicate_path",
				`Duplicate union variant id "${variant.id}" under "${fullPath}"`,
				`${fullPath}.${variant.id}`,
			);
		}
		variantIds.add(variant.id);

		const variantPath = `${fullPath}.${variant.id}`;
		assertComponentWrapperExclusive(ctx, variant, variantPath);
		if (!assertContentArray(ctx, variant.content, variantPath)) {
			continue;
		}

		// Authors must not declare the discriminant field by hand.
		for (const child of variant.content) {
			if (
				isSemanticNode(child) &&
				DURABLE_TREE_TYPES.has(child.type) &&
				"id" in child &&
				(child as { id: string }).id === node.discriminant
			) {
				issue(
					ctx,
					"discriminant_declared",
					`Do not declare discriminant field "${node.discriminant}" on variant "${variant.id}"; it is injected`,
					variantPath,
				);
			}
		}

		const variantChildren = variant.content;
		const content: IrTreeNode[] = variantChildren.map(
			(child: TreeNode, i: number) =>
				compileTreeNode(ctx, child, variantPath, `${variantPath}[${i}]`),
		);

		// Inject discriminant field as leading IR node (literal of variant id).
		const injected: IrField = {
			kind: "field",
			id: node.discriminant,
			schema: { kind: "literal", value: variant.id },
			semanticKind: "literal",
		};

		variants.push({
			kind: "object",
			id: variant.id,
			...(variant.label !== undefined ? { label: variant.label } : {}),
			content: [injected, ...content],
			semanticKind: "object",
			...(variant.component !== undefined
				? { component: variant.component }
				: {}),
			...(variant.wrapper !== undefined ? { wrapper: variant.wrapper } : {}),
			...(variant.props !== undefined ? { props: variant.props } : {}),
		});
	}

	return {
		kind: "discriminatedUnion",
		id: node.id,
		...(node.label !== undefined ? { label: node.label } : {}),
		discriminant: node.discriminant,
		variants,
		semanticKind: "discriminatedUnion",
	};
}

function compileUnionAsSchema(
	ctx: Ctx,
	node: DiscriminatedUnionNode,
	parentPath: string,
): IrDiscriminatedUnion {
	return compileUnionNode(ctx, node, parentPath);
}

function compileField(ctx: Ctx, node: FieldNode, parentPath: string): IrField {
	const fullPath = joinPath(parentPath, node.id);
	registerDurablePath(ctx, fullPath);
	const schema = compileSchema(ctx, node.schema, fullPath);
	return {
		kind: "field",
		id: node.id,
		...(node.label !== undefined ? { label: node.label } : {}),
		schema,
		semanticKind: semanticKindOf(node.schema),
		...(node.component !== undefined ? { component: node.component } : {}),
		...(node.props !== undefined ? { props: node.props } : {}),
	};
}

function compileTreeNode(
	ctx: Ctx,
	node: TreeNode,
	parentPath: string,
	where: string,
): IrTreeNode {
	if (!assertBranded(ctx, node, where)) {
		return { kind: "separator" };
	}

	switch (node.type) {
		case "field":
			return compileField(ctx, node, parentPath);
		case "object":
			return compileObjectNode(ctx, node, parentPath);
		case "array":
			return compileArrayNode(ctx, node, parentPath);
		case "discriminatedUnion":
			return compileUnionNode(ctx, node, parentPath);
		case "tabs": {
			if (!assertContentArray(ctx, node.content, where)) {
				return { kind: "tabs", content: [] };
			}
			return {
				kind: "tabs",
				content: node.content.map((tab, i) => {
					if (
						!assertBranded(ctx, tab, `${where}[${i}]`) ||
						tab.type !== "tab"
					) {
						issue(
							ctx,
							"unknown_node",
							`tabs children must be tab nodes at ${where}[${i}]`,
							`${where}[${i}]`,
						);
						return {
							kind: "tab" as const,
							id: `invalid_${i}`,
							label: "",
							content: [],
						};
					}
					if (!assertContentArray(ctx, tab.content, `${where}.${tab.id}`)) {
						return {
							kind: "tab" as const,
							id: tab.id,
							label: tab.label,
							content: [],
						};
					}
					return {
						kind: "tab" as const,
						id: tab.id,
						label: tab.label,
						...(tab.icon !== undefined ? { icon: tab.icon } : {}),
						content: tab.content.map((child, j) =>
							compileTreeNode(
								ctx,
								child,
								parentPath,
								`${where}.${tab.id}[${j}]`,
							),
						),
					};
				}),
			};
		}
		case "tab": {
			// Bare tab outside tabs — still valid tree node per algebra
			if (!assertContentArray(ctx, node.content, where)) {
				return {
					kind: "tab",
					id: node.id,
					label: node.label,
					content: [],
				};
			}
			return {
				kind: "tab",
				id: node.id,
				label: node.label,
				...(node.icon !== undefined ? { icon: node.icon } : {}),
				content: node.content.map((child, i) =>
					compileTreeNode(ctx, child, parentPath, `${where}[${i}]`),
				),
			};
		}
		case "stack": {
			if (!assertContentArray(ctx, node.content, where)) {
				return { kind: "stack", content: [] };
			}
			return {
				kind: "stack",
				content: node.content.map((child, i) =>
					compileTreeNode(ctx, child, parentPath, `${where}[${i}]`),
				),
			};
		}
		case "columns": {
			if (!assertContentArray(ctx, node.content, where)) {
				return { kind: "columns", content: [] };
			}
			return {
				kind: "columns",
				content: node.content.map((col, i) => {
					if (
						!assertBranded(ctx, col, `${where}[${i}]`) ||
						col.type !== "column"
					) {
						issue(
							ctx,
							"unknown_node",
							`columns children must be column nodes at ${where}[${i}]`,
							`${where}[${i}]`,
						);
						return {
							kind: "column" as const,
							id: `invalid_${i}`,
							width: 1,
							content: [],
						};
					}
					if (!assertContentArray(ctx, col.content, `${where}.${col.id}`)) {
						return {
							kind: "column" as const,
							id: col.id,
							width: col.width,
							content: [],
						};
					}
					return {
						kind: "column" as const,
						id: col.id,
						width: col.width,
						content: col.content.map((child, j) =>
							compileTreeNode(
								ctx,
								child,
								parentPath,
								`${where}.${col.id}[${j}]`,
							),
						),
					};
				}),
			};
		}
		case "column": {
			if (!assertContentArray(ctx, node.content, where)) {
				return {
					kind: "column",
					id: node.id,
					width: node.width,
					content: [],
				};
			}
			return {
				kind: "column",
				id: node.id,
				width: node.width,
				content: node.content.map((child, i) =>
					compileTreeNode(ctx, child, parentPath, `${where}[${i}]`),
				),
			};
		}
		case "group": {
			if (!assertContentArray(ctx, node.content, where)) {
				return { kind: "group", content: [] };
			}
			return {
				kind: "group",
				...(node.id !== undefined ? { id: node.id } : {}),
				...(node.label !== undefined ? { label: node.label } : {}),
				content: node.content.map((child, i) =>
					compileTreeNode(ctx, child, parentPath, `${where}[${i}]`),
				),
			};
		}
		case "header":
			return { kind: "header", label: node.label };
		case "separator":
			return { kind: "separator" };
		default: {
			issue(
				ctx,
				"unknown_node",
				`Unknown tree node type "${(node as { type: string }).type}"`,
				where,
			);
			return { kind: "separator" };
		}
	}
}

function compileLoader(
	ctx: Ctx,
	collection: CollectionNode,
	collectionId: string,
): IrGlobLoader {
	const loader = collection.loader;
	if (!assertBranded(ctx, loader, `${collectionId}.loader`)) {
		return { kind: "glob", base: "", pattern: "" };
	}
	if (loader.type !== "glob") {
		issue(
			ctx,
			"unsupported_loader",
			`Loader "${(loader as { type: string }).type}" is not supported (v1 allows glob only)`,
			`${collectionId}.loader`,
		);
		return { kind: "glob", base: "", pattern: "" };
	}
	return {
		kind: "glob",
		base: loader.base,
		pattern: loader.pattern,
	};
}

function compileCollection(
	ctx: Ctx,
	id: string,
	collection: CollectionNode,
): IrCollection {
	if (!assertBranded(ctx, collection, id) || collection.type !== "collection") {
		issue(
			ctx,
			"unknown_node",
			`Collection "${id}" must be built with s.collection()`,
			id,
		);
		return {
			id,
			loader: { kind: "glob", base: "", pattern: "" },
			schema: { kind: "separator" },
		};
	}

	const loader = compileLoader(ctx, collection, id);
	const schema = compileTreeNode(ctx, collection.schema, "", `${id}.schema`);
	return { id, loader, schema };
}

// ---------------------------------------------------------------------------
// Persisted shape projection
// ---------------------------------------------------------------------------

function unwrapPersistedSchema(schema: IrSchema): PersistedSchema {
	switch (schema.kind) {
		case "string":
		case "number":
		case "boolean":
		case "literal":
		case "enum":
		case "image":
		case "reference":
			return schema;
		case "optional":
			return { kind: "optional", of: unwrapPersistedSchema(schema.of) };
		case "nullable":
			return { kind: "nullable", of: unwrapPersistedSchema(schema.of) };
		case "default":
			return {
				kind: "default",
				of: unwrapPersistedSchema(schema.of),
				value: schema.value,
			};
		case "object":
			return objectToPersisted(schema);
		case "array":
			return {
				kind: "array",
				of: unwrapPersistedSchema(schema.of),
			};
		case "discriminatedUnion":
			return unionToPersisted(schema);
		default: {
			const _exhaustive: never = schema;
			return _exhaustive;
		}
	}
}

function collectDurableFields(nodes: readonly IrTreeNode[]): PersistedField[] {
	const fields: PersistedField[] = [];
	for (const node of nodes) {
		if (PRESENTATION_TYPES.has(node.kind)) {
			if (
				node.kind === "tabs" ||
				node.kind === "stack" ||
				node.kind === "columns" ||
				node.kind === "group"
			) {
				fields.push(
					...collectDurableFields(node.content as readonly IrTreeNode[]),
				);
			} else if (node.kind === "tab" || node.kind === "column") {
				fields.push(...collectDurableFields(node.content));
			}
			// header / separator: skip
			continue;
		}

		switch (node.kind) {
			case "field":
				fields.push({
					id: node.id,
					...(node.label !== undefined ? { label: node.label } : {}),
					schema: unwrapPersistedSchema(node.schema),
					semanticKind: node.semanticKind,
				});
				break;
			case "object":
				fields.push({
					id: node.id,
					...(node.label !== undefined ? { label: node.label } : {}),
					schema: objectToPersisted(node),
					semanticKind: "object",
				});
				break;
			case "array":
				fields.push({
					id: node.id,
					...(node.label !== undefined ? { label: node.label } : {}),
					schema: {
						kind: "array",
						of: unwrapPersistedSchema(node.of),
					},
					semanticKind: "array",
				});
				break;
			case "discriminatedUnion":
				fields.push({
					id: node.id,
					...(node.label !== undefined ? { label: node.label } : {}),
					schema: unionToPersisted(node),
					semanticKind: "discriminatedUnion",
				});
				break;
			default:
				break;
		}
	}
	return fields;
}

function objectToPersisted(node: IrObject): PersistedObject {
	return {
		kind: "object",
		fields: collectDurableFields(node.content),
	};
}

function unionToPersisted(
	node: IrDiscriminatedUnion,
): PersistedDiscriminatedUnion {
	return {
		kind: "discriminatedUnion",
		discriminant: node.discriminant,
		variants: node.variants.map((variant) => ({
			id: variant.id,
			...(variant.label !== undefined ? { label: variant.label } : {}),
			fields: collectDurableFields(variant.content),
		})),
	};
}

function collectionPersisted(
	collection: IrCollection,
): PersistedCollectionShape {
	return {
		loader: collection.loader,
		fields: collectDurableFields([collection.schema]),
	};
}

/**
 * Derive the presentation-stripped persisted shape from compiled IR.
 * No Astro emission; no host FS existence checks.
 */
export function persistedShape(ir: CompiledSemanticIr): PersistedConfigShape {
	return ir.persisted;
}

function buildPersisted(
	collections: Readonly<Record<string, IrCollection>>,
): PersistedConfigShape {
	const out: Record<string, PersistedCollectionShape> = {};
	for (const [id, collection] of Object.entries(collections)) {
		out[id] = collectionPersisted(collection);
	}
	return out;
}

/**
 * Compile a host-authored semantic config into validated IR.
 * Fail-closed on unknown nodes, unknown constraints, duplicate paths,
 * component+wrapper, non-glob loaders, and hand-declared discriminants.
 */
export function compileSemanticIr(
	input: SemanticConfigInput,
): CompiledSemanticIr {
	const ctx: Ctx = { issues: [], seenPaths: new Set() };

	if (
		input === null ||
		typeof input !== "object" ||
		input.collections === null ||
		typeof input.collections !== "object"
	) {
		throw new SemanticIrError([
			{
				code: "invalid_input",
				message:
					"compileSemanticIr expects { collections: Record<string, CollectionNode> }",
			},
		]);
	}

	const collections: Record<string, IrCollection> = {};
	for (const [id, collection] of Object.entries(input.collections)) {
		// Paths are collection-local for uniqueness across one collection tree.
		ctx.seenPaths = new Set();
		collections[id] = compileCollection(ctx, id, collection);
	}

	if (ctx.issues.length > 0) {
		throw new SemanticIrError(ctx.issues);
	}

	const compiled: CompiledSemanticIr = {
		collections,
		persisted: buildPersisted(collections),
	};
	return compiled;
}
