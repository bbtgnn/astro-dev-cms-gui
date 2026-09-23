/**
 * Generate (or --check) native `src/content.config.ts` from a schema partition.
 *
 * Public API for CLI and `cms()` setup — paths in, generated / stale / check /
 * skipped out. Skip/disabled and missing-partition soft exits live here so
 * callers do not need a second wrapper.
 */

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { CompiledSemanticIr } from "@cms/core/semantic";
import { CONTENT_CONFIG_CONVENTION } from "../vite-config-plugin";
import { atomicWriteFile } from "./atomic-write";
import { emitContentConfig } from "./emit-content-config";
import { extractEmbeddedHash, sha256OfFiles } from "./hash";
import {
	loadSchemaPartition,
	SCHEMA_PARTITION_CONVENTION,
} from "./load-schema-partition";

export type GenerateContentConfigOptions = {
	/** Astro project root (resolves convention paths). */
	projectRoot: string;
	/**
	 * Absolute or project-relative path to the Svelte-free schema partition,
	 * or `false` to disable generation. Default:
	 * {@link SCHEMA_PARTITION_CONVENTION}.
	 */
	schemaPartitionPath?: string | false;
	/**
	 * Absolute or project-relative path for generated `content.config.ts`.
	 * Default: first {@link CONTENT_CONFIG_CONVENTION} entry.
	 */
	contentConfigPath?: string;
	/**
	 * Files hashed into `@cms-source-hash:` (never editor modules).
	 * Default: the resolved schema partition path only.
	 */
	schemaSources?: readonly string[];
	/**
	 * Precompiled IR — skips dynamic import of the partition module.
	 * Still hashes `schemaSources` (or the partition path) for staleness.
	 * When set, a missing partition file does not soft-skip.
	 */
	ir?: CompiledSemanticIr;
	/** When true, compare hash only — never write. */
	checkOnly?: boolean;
};

export type GenerateContentConfigResult =
	| { readonly status: "skipped"; readonly reason: "disabled" | "no-partition" }
	| {
			readonly status: "generated";
			readonly sourceHash: string;
			readonly stale: boolean;
			readonly wrote: boolean;
			readonly contentConfigPath: string;
			readonly schemaPartitionPath: string;
	  };

function resolveProjectPath(projectRoot: string, path: string): string {
	return isAbsolute(path) ? path : join(projectRoot, path);
}

/**
 * Emit + atomically write (or --check) generated `content.config.ts`.
 *
 * - `schemaPartitionPath: false` → `{ status: "skipped", reason: "disabled" }`.
 * - Missing partition (and no `ir`) → `{ status: "skipped", reason: "no-partition" }`.
 * - Hash inputs = schema-partition source files only.
 * - Skips write when hash already matches (unless checkOnly).
 * - `checkOnly` + stale → caller should exit non-zero (CLI does).
 */
export async function generateContentConfig(
	options: GenerateContentConfigOptions,
): Promise<GenerateContentConfigResult> {
	if (options.schemaPartitionPath === false) {
		return { status: "skipped", reason: "disabled" };
	}

	const schemaPartitionPath = resolveProjectPath(
		options.projectRoot,
		options.schemaPartitionPath ?? SCHEMA_PARTITION_CONVENTION,
	);

	if (options.ir == null && !existsSync(schemaPartitionPath)) {
		return { status: "skipped", reason: "no-partition" };
	}

	const contentConfigPath = resolveProjectPath(
		options.projectRoot,
		options.contentConfigPath ?? CONTENT_CONFIG_CONVENTION[0],
	);
	const schemaSources = (options.schemaSources ?? [schemaPartitionPath]).map(
		(p) => resolveProjectPath(options.projectRoot, p),
	);

	const sourceHash = sha256OfFiles(schemaSources);
	const ir = options.ir ?? (await loadSchemaPartition(schemaPartitionPath));
	const next = emitContentConfig(ir, { sourceHash });

	let existingHash: string | null = null;
	try {
		existingHash = extractEmbeddedHash(readFileSync(contentConfigPath, "utf8"));
	} catch {
		existingHash = null;
	}

	const stale = existingHash !== sourceHash;

	if (options.checkOnly) {
		return {
			status: "generated",
			sourceHash,
			stale,
			wrote: false,
			contentConfigPath,
			schemaPartitionPath,
		};
	}

	if (!stale) {
		return {
			status: "generated",
			sourceHash,
			stale: false,
			wrote: false,
			contentConfigPath,
			schemaPartitionPath,
		};
	}

	atomicWriteFile(contentConfigPath, next);
	return {
		status: "generated",
		sourceHash,
		stale: true,
		wrote: true,
		contentConfigPath,
		schemaPartitionPath,
	};
}
