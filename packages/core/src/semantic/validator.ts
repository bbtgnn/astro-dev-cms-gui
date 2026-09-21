/**
 * Component-free authoritative persisted-input validator from semantic IR
 * (ADR-0010 / ADR-0019). Hosts inject image / reference existence checks;
 * FS is never hardcoded here.
 *
 * Plug into write-back via `createCmsProtocol({ schemas: validator.schemas })`
 * or call `safeParseAsync` before upsert.
 */

import type { z } from "zod";
import {
	type AuthoritativeValidatorDeps,
	persistedProjections,
} from "./persisted-projections";
import type { CompiledSemanticIr } from "./types";

export type { AuthoritativeValidatorDeps };

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
	const schemas = persistedProjections(ir).zodSchemas(deps);

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
