/**
 * Setup-hook entry for ADR-0019 content.config generation.
 *
 * Called from `astro:config:setup` before Astro evaluates `content.config.ts`.
 * Loads the Svelte-free unified tree (`cms.config.ts`) — never the Vite
 * components catalog.
 */

import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import {
	type GenerateContentConfigResult,
	generateContentConfig,
} from "./generate-content-config";
import { SCHEMA_PARTITION_CONVENTION } from "./load-schema-partition";

export type RunContentConfigGenerationOptions = {
	/** Astro project root. */
	projectRoot: string;
	/**
	 * Schema partition path (project-relative or absolute), or `false` to
	 * disable generation. Default: {@link SCHEMA_PARTITION_CONVENTION}.
	 */
	schemaPartition?: string | false;
};

export type RunContentConfigGenerationResult =
	| { readonly status: "skipped"; readonly reason: "disabled" | "no-partition" }
	| {
			readonly status: "generated";
			readonly result: GenerateContentConfigResult;
	  };

function resolvePartitionPath(
	projectRoot: string,
	schemaPartition: string | false | undefined,
): string | null {
	if (schemaPartition === false) return null;
	const relOrAbs = schemaPartition ?? SCHEMA_PARTITION_CONVENTION;
	return isAbsolute(relOrAbs) ? relOrAbs : join(projectRoot, relOrAbs);
}

/**
 * Regenerate `src/content.config.ts` when a schema partition is present.
 *
 * - Missing partition → skip (hosts still hand-authoring content.config).
 * - `schemaPartition: false` → skip.
 * - Partition present → call {@link generateContentConfig}; throw on failure.
 */
export async function runContentConfigGeneration(
	options: RunContentConfigGenerationOptions,
): Promise<RunContentConfigGenerationResult> {
	if (options.schemaPartition === false) {
		return { status: "skipped", reason: "disabled" };
	}

	const schemaPartitionPath = resolvePartitionPath(
		options.projectRoot,
		options.schemaPartition,
	);
	if (schemaPartitionPath == null || !existsSync(schemaPartitionPath)) {
		return { status: "skipped", reason: "no-partition" };
	}

	const result = await generateContentConfig({
		projectRoot: options.projectRoot,
		schemaPartitionPath,
	});

	return { status: "generated", result };
}
