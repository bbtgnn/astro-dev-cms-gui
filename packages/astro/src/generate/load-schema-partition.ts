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

import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
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

function compileFromModule(mod: Record<string, unknown>, where: string) {
	const partition = resolvePartitionExport(mod);

	if (partition.ir !== undefined) {
		if (!isCompiledIr(partition.ir)) {
			throw new Error(
				`schema partition "ir" export is not CompiledSemanticIr at ${where}`,
			);
		}
		return partition.ir;
	}

	if (
		partition.collections == null ||
		typeof partition.collections !== "object"
	) {
		throw new Error(
			`schema partition missing "collections" or "ir" export at ${where} ` +
				`(author with @cms/core/semantic — never import Svelte editors here)`,
		);
	}

	return compileSemanticIr({ collections: partition.collections });
}

function isUnresolvedWorkspaceTs(err: unknown): boolean {
	const message = err instanceof Error ? err.message : String(err);
	return (
		message.includes("Cannot find module") ||
		message.includes("ERR_MODULE_NOT_FOUND") ||
		message.includes("Module not found")
	);
}

/**
 * Astro's config hook often runs under Node, which cannot resolve workspace
 * extensionless `.ts` imports. Fall back to a Bun worker that can.
 */
function loadSchemaPartitionViaBun(
	schemaPartitionPath: string,
): CompiledSemanticIr {
	if (process.env.CMS_PARTITION_WORKER === "1") {
		throw new Error(
			`schema partition worker recursion while loading ${schemaPartitionPath}`,
		);
	}

	const worker = fileURLToPath(
		new URL("./load-partition-worker.ts", import.meta.url),
	);
	const bun = /bun/i.test(process.execPath) ? process.execPath : "bun";
	const result = spawnSync(bun, [worker, schemaPartitionPath], {
		encoding: "utf8",
		env: { ...process.env, CMS_PARTITION_WORKER: "1" },
		maxBuffer: 16 * 1024 * 1024,
	});

	if (result.status !== 0) {
		throw new Error(
			result.stderr?.trim() ||
				result.stdout?.trim() ||
				`Failed to load schema partition via bun (exit ${String(result.status)})`,
		);
	}

	const ir = JSON.parse(result.stdout) as unknown;
	if (!isCompiledIr(ir)) {
		throw new Error(
			`bun partition worker returned invalid IR for ${schemaPartitionPath}`,
		);
	}
	return ir;
}

/**
 * Dynamically import a schema partition and return compiled IR.
 * Fail closed if the module does not expose collections or ir.
 *
 * Escapes Vite's module runner via native `import()`, then falls back to a Bun
 * worker when Node cannot resolve workspace TypeScript.
 */
export async function loadSchemaPartition(
	schemaPartitionPath: string,
): Promise<CompiledSemanticIr> {
	const href = pathToFileURL(schemaPartitionPath).href;
	try {
		const nativeImport = new Function(
			"specifier",
			"return import(specifier)",
		) as (specifier: string) => Promise<Record<string, unknown>>;
		const mod = await nativeImport(href);
		return compileFromModule(mod, schemaPartitionPath);
	} catch (err) {
		if (!isUnresolvedWorkspaceTs(err)) throw err;
		return loadSchemaPartitionViaBun(schemaPartitionPath);
	}
}
