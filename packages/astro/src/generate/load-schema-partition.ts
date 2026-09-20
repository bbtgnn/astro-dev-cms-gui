/**
 * Schema-partition load seam (ADR-0019).
 *
 * Generation must never import the host's full `cms.config.ts` (Svelte editors).
 * Hosts expose a Svelte-free partition module that exports either:
 *
 * - `collections` — authored with `@cms/core/semantic` `s` builders, or
 * - `ir` — precompiled `CompiledSemanticIr`
 *
 * Slice 4 (`cms()` hooks) calls the same loader / `generateContentConfig`.
 */

import { pathToFileURL } from "node:url";
import {
	type CompiledSemanticIr,
	compileSemanticIr,
	type SemanticConfigInput,
} from "@cms/core/semantic";

/**
 * Convention path (project-relative) for the Svelte-free schema partition.
 * Distinct from `src/cms.config.ts` (browser unified tree with editors).
 */
export const SCHEMA_PARTITION_CONVENTION = "src/cms.schema.ts";

/**
 * Expected exports from a schema partition module.
 * Prefer `collections` from `@cms/core/semantic`; `ir` skips compile.
 */
export type SchemaPartitionExport = {
	readonly collections?: SemanticConfigInput["collections"];
	readonly ir?: CompiledSemanticIr;
};

function isCompiledIr(value: unknown): value is CompiledSemanticIr {
	return (
		typeof value === "object" &&
		value !== null &&
		"collections" in value &&
		"persisted" in value &&
		typeof (value as CompiledSemanticIr).collections === "object" &&
		typeof (value as CompiledSemanticIr).persisted === "object"
	);
}

function resolvePartitionExport(
	mod: Record<string, unknown>,
): SchemaPartitionExport {
	const nested = mod.schemaPartition;
	if (
		typeof nested === "object" &&
		nested !== null &&
		("collections" in nested || "ir" in nested)
	) {
		return nested as SchemaPartitionExport;
	}

	const def = mod.default;
	if (
		typeof def === "object" &&
		def !== null &&
		("collections" in def || "ir" in def)
	) {
		return def as SchemaPartitionExport;
	}

	return {
		collections: mod.collections as
			| SemanticConfigInput["collections"]
			| undefined,
		ir: mod.ir as CompiledSemanticIr | undefined,
	};
}

/**
 * Dynamically import a schema partition and return compiled IR.
 * Fail closed if the module does not expose collections or ir.
 */
export async function loadSchemaPartition(
	schemaPartitionPath: string,
): Promise<CompiledSemanticIr> {
	const mod = (await import(pathToFileURL(schemaPartitionPath).href)) as Record<
		string,
		unknown
	>;
	const partition = resolvePartitionExport(mod);

	if (partition.ir !== undefined) {
		if (!isCompiledIr(partition.ir)) {
			throw new Error(
				`schema partition "ir" export is not CompiledSemanticIr at ${schemaPartitionPath}`,
			);
		}
		return partition.ir;
	}

	if (
		partition.collections == null ||
		typeof partition.collections !== "object"
	) {
		throw new Error(
			`schema partition missing "collections" or "ir" export at ${schemaPartitionPath} ` +
				`(author with @cms/core/semantic — never import Svelte editors here)`,
		);
	}

	return compileSemanticIr({ collections: partition.collections });
}
