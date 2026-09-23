/**
 * One walker for persisted-schema projections (ADR-0010 / 0019).
 *
 * Public seam: `persistedProjections(ir)` → jsonSchemas / zodSchemas / astroSchemaPlan.
 * Layout / presentation walks stay elsewhere.
 */

import { z } from "zod";
import { persistedShape } from "./compile";
import type {
	CompiledSemanticIr,
	IrEnum,
	IrLiteral,
	IrNumber,
	IrReference,
	IrString,
	NumberConstraint,
	PersistedArray,
	PersistedDefault,
	PersistedDiscriminatedUnion,
	PersistedField,
	PersistedNullable,
	PersistedObject,
	PersistedOptional,
	PersistedSchema,
	SemanticKind,
	StringConstraint,
} from "./types";
/** Host-injected existence checks for image / reference leaves. */
export type AuthoritativeValidatorDeps = {
	/**
	 * True when the persisted image path is allowlisted and resolves to an
	 * accepted asset. Omitted → structural string check only.
	 */
	readonly isAcceptedImageAsset?: (path: string) => boolean | Promise<boolean>;
	/**
	 * True when `id` exists in `collection`. Omitted → structural string check
	 * only (collection name is still fixed by the IR reference node).
	 */
	readonly entryExists?: (
		collection: string,
		id: string,
	) => boolean | Promise<boolean>;
};

// ---------------------------------------------------------------------------
// Public product types
// ---------------------------------------------------------------------------

/** JSON Schema object suitable for form-model client validation. */
export type JsonSchema = Readonly<Record<string, unknown>>;

export type AstroSchemaConstraint = StringConstraint | NumberConstraint;

/**
 * Astro-facing schema expression tree — serializable, no `astro` import.
 * `@cms/astro` renders this into `content.config.ts` source.
 */
export type AstroSchemaExpr =
	| {
			readonly tag: "string";
			readonly constraints: readonly AstroSchemaConstraint[];
	  }
	| {
			readonly tag: "number";
			readonly constraints: readonly AstroSchemaConstraint[];
	  }
	| { readonly tag: "boolean" }
	| { readonly tag: "literal"; readonly value: string | number | boolean }
	| { readonly tag: "enum"; readonly values: readonly [string, ...string[]] }
	| { readonly tag: "image" }
	| { readonly tag: "reference"; readonly collection: string }
	| { readonly tag: "optional"; readonly of: AstroSchemaExpr }
	| { readonly tag: "nullable"; readonly of: AstroSchemaExpr }
	| {
			readonly tag: "default";
			readonly of: AstroSchemaExpr;
			readonly value: unknown;
	  }
	| { readonly tag: "array"; readonly of: AstroSchemaExpr }
	| {
			readonly tag: "object";
			readonly fields: readonly {
				readonly id: string;
				readonly schema: AstroSchemaExpr;
			}[];
	  }
	| {
			readonly tag: "discriminatedUnion";
			readonly discriminant: string;
			readonly variants: readonly {
				readonly id: string;
				readonly fields: readonly {
					readonly id: string;
					readonly schema: AstroSchemaExpr;
				}[];
			}[];
	  };

export type AstroCollectionSchemaPlan = {
	readonly root: AstroSchemaExpr;
	readonly needsImage: boolean;
	readonly needsReference: boolean;
};

export type AstroSchemaPlan = {
	readonly collectionIds: readonly string[];
	readonly byCollection: Readonly<Record<string, AstroCollectionSchemaPlan>>;
	readonly needsImage: boolean;
	readonly needsReference: boolean;
};

/**
 * Bound to one compiled IR's persisted partition.
 * Methods are pure and independent (lazy — calling one does not force the others).
 */
export type PersistedProjections = {
	jsonSchemas(): Readonly<Record<string, JsonSchema>>;
	zodSchemas(
		deps?: AuthoritativeValidatorDeps,
	): Readonly<Record<string, z.ZodType>>;
	astroSchemaPlan(): AstroSchemaPlan;
};

// ---------------------------------------------------------------------------
// Private fold
// ---------------------------------------------------------------------------

type FoldCtx = {
	readonly path: string;
};

type FieldPresence = "required" | "optional";

type FoldedField<T> = {
	readonly id: string;
	readonly label?: string;
	readonly semanticKind: SemanticKind;
	readonly presence: FieldPresence;
	readonly schema: PersistedSchema;
	readonly value: T;
};

type FoldedVariant<T> = {
	readonly id: string;
	readonly label?: string;
	readonly fields: readonly FoldedField<T>[];
};

type PersistedAlgebra<T> = {
	string(node: IrString, ctx: FoldCtx): T;
	number(node: IrNumber, ctx: FoldCtx): T;
	boolean(ctx: FoldCtx): T;
	literal(node: IrLiteral, ctx: FoldCtx): T;
	enum(node: IrEnum, ctx: FoldCtx): T;
	image(ctx: FoldCtx): T;
	reference(node: IrReference, ctx: FoldCtx): T;
	optional(inner: T, node: PersistedOptional, ctx: FoldCtx): T;
	nullable(inner: T, node: PersistedNullable, ctx: FoldCtx): T;
	default(inner: T, node: PersistedDefault, ctx: FoldCtx): T;
	array(inner: T, node: PersistedArray, ctx: FoldCtx): T;
	object(
		fields: readonly FoldedField<T>[],
		node: PersistedObject,
		ctx: FoldCtx,
	): T;
	discriminatedUnion(
		variants: readonly FoldedVariant<T>[],
		node: PersistedDiscriminatedUnion,
		ctx: FoldCtx,
	): T;
};

function joinPath(parent: string, id: string): string {
	return parent === "" ? id : `${parent}.${id}`;
}

function fieldPresence(schema: PersistedSchema): FieldPresence {
	if (schema.kind === "optional" || schema.kind === "default")
		return "optional";
	if (schema.kind === "nullable") return fieldPresence(schema.of);
	return "required";
}

function foldFields<T>(
	fields: readonly PersistedField[],
	algebra: PersistedAlgebra<T>,
	parentPath: string,
): FoldedField<T>[] {
	return fields.map((field) => {
		const path = joinPath(parentPath, field.id);
		return {
			id: field.id,
			...(field.label !== undefined ? { label: field.label } : {}),
			semanticKind: field.semanticKind,
			presence: fieldPresence(field.schema),
			schema: field.schema,
			value: foldPersisted(field.schema, algebra, { path }),
		};
	});
}

function foldPersisted<T>(
	schema: PersistedSchema,
	algebra: PersistedAlgebra<T>,
	ctx: FoldCtx,
): T {
	switch (schema.kind) {
		case "string":
			return algebra.string(schema, ctx);
		case "number":
			return algebra.number(schema, ctx);
		case "boolean":
			return algebra.boolean(ctx);
		case "literal":
			return algebra.literal(schema, ctx);
		case "enum":
			return algebra.enum(schema, ctx);
		case "image":
			return algebra.image(ctx);
		case "reference":
			return algebra.reference(schema, ctx);
		case "optional":
			return algebra.optional(
				foldPersisted(schema.of, algebra, ctx),
				schema,
				ctx,
			);
		case "nullable":
			return algebra.nullable(
				foldPersisted(schema.of, algebra, ctx),
				schema,
				ctx,
			);
		case "default":
			return algebra.default(
				foldPersisted(schema.of, algebra, ctx),
				schema,
				ctx,
			);
		case "array":
			return algebra.array(
				foldPersisted(schema.of, algebra, {
					path: `${ctx.path}[]`,
				}),
				schema,
				ctx,
			);
		case "object":
			return algebra.object(
				foldFields(schema.fields, algebra, ctx.path),
				schema,
				ctx,
			);
		case "discriminatedUnion":
			return algebra.discriminatedUnion(
				schema.variants.map((variant) => {
					const variantPath =
						ctx.path === "" ? variant.id : `${ctx.path}.${variant.id}`;
					return {
						id: variant.id,
						...(variant.label !== undefined ? { label: variant.label } : {}),
						fields: foldFields(variant.fields, algebra, variantPath),
					};
				}),
				schema,
				ctx,
			);
		default: {
			const _exhaustive: never = schema;
			throw new Error(
				`Unexpected persisted IR node at ${ctx.path}: ${JSON.stringify(_exhaustive)}`,
			);
		}
	}
}

function foldCollectionRoot<T>(
	fields: readonly PersistedField[],
	algebra: PersistedAlgebra<T>,
): T {
	const synthetic: PersistedObject = { kind: "object", fields };
	return algebra.object(foldFields(fields, algebra, ""), synthetic, {
		path: "",
	});
}

// ---------------------------------------------------------------------------
// JSON Schema algebra
// ---------------------------------------------------------------------------

function jsonSchemaAlgebra(): PersistedAlgebra<JsonSchema> {
	return {
		string(node) {
			const out: Record<string, unknown> = { type: "string" };
			for (const c of node.constraints) {
				if (c.method === "min") out.minLength = c.value;
				else if (c.method === "max") out.maxLength = c.value;
				else if (c.method === "regex") out.pattern = c.source;
			}
			return out;
		},
		number(node) {
			const out: Record<string, unknown> = { type: "number" };
			for (const c of node.constraints) {
				if (c.method === "min") out.minimum = c.value;
				else if (c.method === "max") out.maximum = c.value;
				else if (c.method === "int") out.type = "integer";
			}
			return out;
		},
		boolean: () => ({ type: "boolean" }),
		literal: (node) => ({ const: node.value }),
		enum: (node) => ({ type: "string", enum: [...node.values] }),
		image: () => ({ type: "string" }),
		reference: () => ({ type: "string" }),
		optional: (inner) => inner,
		nullable: (inner) => ({ anyOf: [inner, { type: "null" }] }),
		default: (inner, node) => ({ ...inner, default: node.value }),
		array: (inner) => ({ type: "array", items: inner }),
		object(fields) {
			const properties: Record<string, unknown> = {};
			const required: string[] = [];
			for (const field of fields) {
				properties[field.id] = {
					...field.value,
					...(field.label !== undefined ? { title: field.label } : {}),
				};
				if (field.presence === "required") required.push(field.id);
			}
			return {
				type: "object",
				properties,
				...(required.length > 0 ? { required } : {}),
				additionalProperties: false,
			};
		},
		discriminatedUnion(variants) {
			return {
				oneOf: variants.map((variant) => {
					const properties: Record<string, unknown> = {};
					const required: string[] = [];
					for (const field of variant.fields) {
						properties[field.id] = {
							...field.value,
							...(field.label !== undefined ? { title: field.label } : {}),
						};
						if (field.presence === "required") required.push(field.id);
					}
					return {
						type: "object",
						properties,
						...(required.length > 0 ? { required } : {}),
						additionalProperties: false,
						...(variant.label !== undefined ? { title: variant.label } : {}),
					};
				}),
			};
		},
	};
}

// ---------------------------------------------------------------------------
// Zod algebra
// ---------------------------------------------------------------------------

function stringConstraints(
	base: z.ZodString,
	constraints: readonly StringConstraint[],
): z.ZodString {
	let out = base;
	for (const c of constraints) {
		if (c.method === "min") out = out.min(c.value);
		else if (c.method === "max") out = out.max(c.value);
		else if (c.method === "regex") {
			out = out.regex(new RegExp(c.source, c.flags));
		}
	}
	return out;
}

function numberConstraints(
	base: z.ZodNumber,
	constraints: readonly NumberConstraint[],
): z.ZodNumber {
	let out = base;
	for (const c of constraints) {
		if (c.method === "min") out = out.min(c.value);
		else if (c.method === "max") out = out.max(c.value);
		else if (c.method === "int") out = out.int();
	}
	return out;
}

function zodAlgebra(
	deps: AuthoritativeValidatorDeps | undefined,
): PersistedAlgebra<z.ZodType> {
	return {
		string: (node) => stringConstraints(z.string(), node.constraints),
		number: (node) => numberConstraints(z.number(), node.constraints),
		boolean: () => z.boolean(),
		literal: (node) => z.literal(node.value),
		enum: (node) => z.enum(node.values),
		image(_ctx) {
			let imageSchema: z.ZodType = z.string();
			if (deps?.isAcceptedImageAsset) {
				const check = deps.isAcceptedImageAsset;
				imageSchema = z.string().refine(async (value) => check(value), {
					message: `Image path not accepted at ${_ctx.path}`,
				});
			}
			return imageSchema;
		},
		reference(node, ctx) {
			const target = node.collection;
			let refSchema: z.ZodType = z.string();
			if (deps?.entryExists) {
				const exists = deps.entryExists;
				refSchema = z.string().refine(async (id) => exists(target, id), {
					message: `Reference "${ctx.path}" target not found in collection "${target}"`,
				});
			}
			return refSchema;
		},
		optional: (inner) => inner.optional(),
		nullable: (inner) => inner.nullable(),
		default: (inner, node) => inner.default(node.value),
		array: (inner) => z.array(inner),
		object(fields) {
			const shape: Record<string, z.ZodType> = {};
			for (const field of fields) {
				shape[field.id] = field.value;
			}
			return z.object(shape);
		},
		discriminatedUnion(variants, node) {
			if (variants.length === 0) return z.never();
			const options = variants.map((variant) => {
				const shape: Record<string, z.ZodType> = {
					[node.discriminant]: z.literal(variant.id),
				};
				for (const field of variant.fields) {
					if (field.id === node.discriminant) continue;
					shape[field.id] = field.value;
				}
				return z.object(shape);
			});
			const [first, ...rest] = options;
			if (!first) return z.never();
			if (rest.length === 0) return first;
			return z.discriminatedUnion(node.discriminant, [first, ...rest] as [
				z.ZodObject,
				z.ZodObject,
				...z.ZodObject[],
			]);
		},
	};
}

// ---------------------------------------------------------------------------
// Astro expr algebra
// ---------------------------------------------------------------------------

type AstroFold = {
	readonly expr: AstroSchemaExpr;
	readonly needsImage: boolean;
	readonly needsReference: boolean;
};

function astroExprAlgebra(): PersistedAlgebra<AstroFold> {
	const leaf = (
		expr: AstroSchemaExpr,
		needsImage = false,
		needsReference = false,
	): AstroFold => ({ expr, needsImage, needsReference });

	return {
		string: (node) => leaf({ tag: "string", constraints: node.constraints }),
		number: (node) => leaf({ tag: "number", constraints: node.constraints }),
		boolean: () => leaf({ tag: "boolean" }),
		literal: (node) => leaf({ tag: "literal", value: node.value }),
		enum: (node) => leaf({ tag: "enum", values: node.values }),
		image: () => leaf({ tag: "image" }, true, false),
		reference: (node) =>
			leaf({ tag: "reference", collection: node.collection }, false, true),
		optional: (inner) =>
			leaf(
				{ tag: "optional", of: inner.expr },
				inner.needsImage,
				inner.needsReference,
			),
		nullable: (inner) =>
			leaf(
				{ tag: "nullable", of: inner.expr },
				inner.needsImage,
				inner.needsReference,
			),
		default: (inner, node) =>
			leaf(
				{ tag: "default", of: inner.expr, value: node.value },
				inner.needsImage,
				inner.needsReference,
			),
		array: (inner) =>
			leaf(
				{ tag: "array", of: inner.expr },
				inner.needsImage,
				inner.needsReference,
			),
		object(fields) {
			let needsImage = false;
			let needsReference = false;
			const outFields = fields.map((f) => {
				needsImage ||= f.value.needsImage;
				needsReference ||= f.value.needsReference;
				return { id: f.id, schema: f.value.expr };
			});
			return leaf(
				{ tag: "object", fields: outFields },
				needsImage,
				needsReference,
			);
		},
		discriminatedUnion(variants, node) {
			if (variants.length === 0) {
				throw new Error(
					`discriminatedUnion "${node.discriminant}" has no variants`,
				);
			}
			let needsImage = false;
			let needsReference = false;
			const outVariants = variants.map((variant) => {
				const fields = variant.fields.map((f) => {
					needsImage ||= f.value.needsImage;
					needsReference ||= f.value.needsReference;
					return { id: f.id, schema: f.value.expr };
				});
				return { id: variant.id, fields };
			});
			return leaf(
				{
					tag: "discriminatedUnion",
					discriminant: node.discriminant,
					variants: outVariants,
				},
				needsImage,
				needsReference,
			);
		},
	};
}

/**
 * Project one persisted schema node to an Astro expr (same algebra as the plan).
 * Package-internal — use `persistedProjections(ir).astroSchemaPlan()` at the seam.
 */
export function projectAstroSchemaExpr(
	schema: PersistedSchema,
): AstroSchemaExpr {
	return foldPersisted(schema, astroExprAlgebra(), { path: "" }).expr;
}

/**
 * Create the projection handle. Does not walk until a method is called.
 * Reads only the internal persisted partition — never the presentation IR tree.
 */
export function persistedProjections(
	ir: CompiledSemanticIr,
): PersistedProjections {
	const persisted = persistedShape(ir);
	return {
		jsonSchemas() {
			const out: Record<string, JsonSchema> = {};
			const algebra = jsonSchemaAlgebra();
			for (const [id, shape] of Object.entries(persisted)) {
				out[id] = foldCollectionRoot(shape.fields, algebra);
			}
			return out;
		},
		zodSchemas(deps) {
			const out: Record<string, z.ZodType> = {};
			const algebra = zodAlgebra(deps);
			for (const [id, shape] of Object.entries(persisted)) {
				out[id] = foldCollectionRoot(shape.fields, algebra);
			}
			return out;
		},
		astroSchemaPlan() {
			const algebra = astroExprAlgebra();
			const collectionIds = Object.keys(persisted).sort();
			const byCollection: Record<string, AstroCollectionSchemaPlan> = {};
			let needsImage = false;
			let needsReference = false;
			for (const id of collectionIds) {
				const shape = persisted[id];
				if (shape === undefined) continue;
				const folded = foldCollectionRoot(shape.fields, algebra);
				byCollection[id] = {
					root: folded.expr,
					needsImage: folded.needsImage,
					needsReference: folded.needsReference,
				};
				needsImage ||= folded.needsImage;
				needsReference ||= folded.needsReference;
			}
			return { collectionIds, byCollection, needsImage, needsReference };
		},
	};
}
