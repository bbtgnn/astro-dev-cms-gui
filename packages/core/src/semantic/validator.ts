/**
 * Component-free authoritative persisted-input validator from semantic IR
 * (ADR-0010 / ADR-0019). Hosts inject image / reference existence checks;
 * FS is never hardcoded here.
 *
 * Plug into write-back via `createCmsProtocol({ schemas: validator.schemas })`
 * or call `safeParseAsync` before upsert.
 */

import { z } from "zod";
import type {
	CompiledSemanticIr,
	PersistedCollectionShape,
	PersistedField,
	PersistedSchema,
} from "./types";

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

export type AuthoritativeParseIssue = {
	readonly path: readonly (string | number)[];
	readonly message: string;
	readonly code?: string;
};

export type AuthoritativeParseResult =
	| { readonly success: true; readonly data: unknown }
	| {
			readonly success: false;
			readonly issues: readonly AuthoritativeParseIssue[];
	  };

export type AuthoritativeValidator = {
	/**
	 * Per-collection Zod schemas (persisted input). Pass to
	 * `createWriteMode` / `createCmsProtocol` as `schemas`.
	 */
	readonly schemas: Readonly<Record<string, z.ZodType>>;
	/** Validate one collection's entry data (Zod-input shape only). */
	safeParseAsync(
		collection: string,
		data: unknown,
	): Promise<AuthoritativeParseResult>;
};

function stringConstraints(
	base: z.ZodString,
	constraints: readonly {
		readonly method: string;
		readonly value?: number;
		readonly source?: string;
		readonly flags?: string;
	}[],
): z.ZodString {
	let out = base;
	for (const c of constraints) {
		if (c.method === "min" && typeof c.value === "number") {
			out = out.min(c.value);
		} else if (c.method === "max" && typeof c.value === "number") {
			out = out.max(c.value);
		} else if (c.method === "regex" && typeof c.source === "string") {
			out = out.regex(new RegExp(c.source, c.flags ?? ""));
		}
	}
	return out;
}

function numberConstraints(
	base: z.ZodNumber,
	constraints: readonly {
		readonly method: string;
		readonly value?: number;
	}[],
): z.ZodNumber {
	let out = base;
	for (const c of constraints) {
		if (c.method === "min" && typeof c.value === "number") {
			out = out.min(c.value);
		} else if (c.method === "max" && typeof c.value === "number") {
			out = out.max(c.value);
		} else if (c.method === "int") {
			out = out.int();
		}
	}
	return out;
}

function persistedToZod(
	schema: PersistedSchema,
	deps: AuthoritativeValidatorDeps | undefined,
	path: string,
): z.ZodType {
	switch (schema.kind) {
		case "string":
			return stringConstraints(z.string(), schema.constraints);
		case "number":
			return numberConstraints(z.number(), schema.constraints);
		case "boolean":
			return z.boolean();
		case "literal":
			return z.literal(schema.value);
		case "enum":
			return z.enum(schema.values);
		case "image": {
			let imageSchema: z.ZodType = z.string();
			if (deps?.isAcceptedImageAsset) {
				const check = deps.isAcceptedImageAsset;
				imageSchema = z.string().refine(async (value) => check(value), {
					message: `Image path not accepted at ${path}`,
				});
			}
			return imageSchema;
		}
		case "reference": {
			const target = schema.collection;
			let refSchema: z.ZodType = z.string();
			if (deps?.entryExists) {
				const exists = deps.entryExists;
				refSchema = z.string().refine(async (id) => exists(target, id), {
					message: `Reference "${path}" target not found in collection "${target}"`,
				});
			}
			return refSchema;
		}
		case "optional":
			return persistedToZod(schema.of, deps, path).optional();
		case "nullable":
			return persistedToZod(schema.of, deps, path).nullable();
		case "default":
			return persistedToZod(schema.of, deps, path).default(schema.value);
		case "object":
			return fieldsToZodObject(schema.fields, deps, path);
		case "array":
			return z.array(persistedToZod(schema.of, deps, `${path}[]`));
		case "discriminatedUnion": {
			if (schema.variants.length === 0) {
				return z.never();
			}
			const options = schema.variants.map((variant) => {
				const shape: Record<string, z.ZodType> = {
					[schema.discriminant]: z.literal(variant.id),
				};
				for (const field of variant.fields) {
					if (field.id === schema.discriminant) {
						// Discriminant already injected as literal.
						continue;
					}
					const fieldPath =
						path === ""
							? `${variant.id}.${field.id}`
							: `${path}.${variant.id}.${field.id}`;
					shape[field.id] = persistedToZod(field.schema, deps, fieldPath);
				}
				return z.object(shape);
			});
			// z.discriminatedUnion needs a non-empty tuple.
			const [first, ...rest] = options;
			if (!first) return z.never();
			if (rest.length === 0) return first;
			return z.discriminatedUnion(schema.discriminant, [first, ...rest] as [
				z.ZodObject,
				z.ZodObject,
				...z.ZodObject[],
			]);
		}
		default: {
			const _exhaustive: never = schema;
			return _exhaustive;
		}
	}
}

function fieldsToZodObject(
	fields: readonly PersistedField[],
	deps: AuthoritativeValidatorDeps | undefined,
	parentPath: string,
): z.ZodObject {
	const shape: Record<string, z.ZodType> = {};
	for (const field of fields) {
		const fieldPath =
			parentPath === "" ? field.id : `${parentPath}.${field.id}`;
		shape[field.id] = persistedToZod(field.schema, deps, fieldPath);
	}
	return z.object(shape);
}

function collectionToZod(
	shape: PersistedCollectionShape,
	deps: AuthoritativeValidatorDeps | undefined,
): z.ZodType {
	return fieldsToZodObject(shape.fields, deps, "");
}

function mapZodIssues(
	issues: readonly { path: PropertyKey[]; message: string; code?: string }[],
): AuthoritativeParseIssue[] {
	return issues.map((issue) => ({
		path: issue.path.map((p) =>
			typeof p === "symbol" ? String(p) : (p as string | number),
		),
		message: issue.message,
		...(issue.code !== undefined ? { code: issue.code } : {}),
	}));
}

/**
 * Build an authoritative persisted-input validator from compiled IR.
 * Image allowlist and reference existence are injectable host checks.
 */
export function createAuthoritativeValidator(
	ir: CompiledSemanticIr,
	deps?: AuthoritativeValidatorDeps,
): AuthoritativeValidator {
	const schemas: Record<string, z.ZodType> = {};
	for (const [id, persisted] of Object.entries(ir.persisted)) {
		schemas[id] = collectionToZod(persisted, deps);
	}

	return {
		schemas,
		async safeParseAsync(collection, data) {
			const schema = schemas[collection];
			if (!schema) {
				return {
					success: false,
					issues: [
						{
							path: [],
							message: `Unknown collection "${collection}"`,
							code: "unknown_collection",
						},
					],
				};
			}
			const parsed = await schema.safeParseAsync(data);
			if (parsed.success) {
				return { success: true, data: parsed.data };
			}
			return {
				success: false,
				issues: mapZodIssues(parsed.error.issues),
			};
		},
	};
}
