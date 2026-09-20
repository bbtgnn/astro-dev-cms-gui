#!/usr/bin/env bun
/**
 * `cms` CLI — generation commands for ADR-0019.
 *
 *   cms generate           write content.config.ts when stale
 *   cms generate --check   exit 1 when generated file is missing/stale
 *
 * Slice 4 will also call `generateContentConfig` from `astro:config:setup`.
 */

import { resolve } from "node:path";
import { generateContentConfig } from "../src/generate/generate-content-config.ts";
import { SCHEMA_PARTITION_CONVENTION } from "../src/generate/load-schema-partition.ts";

function printHelp(): void {
	process.stdout.write(`Usage:
  cms generate [--check] [--root <dir>] [--partition <path>] [--out <path>]

Options:
  --check         Fail (exit 1) when content.config is missing or stale
  --root <dir>    Project root (default: cwd)
  --partition     Schema partition module (default: ${SCHEMA_PARTITION_CONVENTION})
  --out           Generated content.config path (default: src/content.config.ts)
  -h, --help      Show this help

The schema partition must export Svelte-free \`collections\` (from
@cms/core/semantic) or precompiled \`ir\`. Never point --partition at
cms.config.ts editor modules.
`);
}

function parseArgs(argv: string[]): {
	command: string | null;
	checkOnly: boolean;
	projectRoot: string;
	schemaPartitionPath?: string;
	contentConfigPath?: string;
	help: boolean;
} {
	let command: string | null = null;
	let checkOnly = false;
	let projectRoot = process.cwd();
	let schemaPartitionPath: string | undefined;
	let contentConfigPath: string | undefined;
	let help = false;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === undefined) continue;
		if (arg === "-h" || arg === "--help") {
			help = true;
			continue;
		}
		if (arg === "--check") {
			checkOnly = true;
			continue;
		}
		if (arg === "--root") {
			const next = argv[++i];
			if (next === undefined) throw new Error("--root requires a path");
			projectRoot = resolve(next);
			continue;
		}
		if (arg === "--partition") {
			const next = argv[++i];
			if (next === undefined) throw new Error("--partition requires a path");
			schemaPartitionPath = next;
			continue;
		}
		if (arg === "--out") {
			const next = argv[++i];
			if (next === undefined) throw new Error("--out requires a path");
			contentConfigPath = next;
			continue;
		}
		if (arg.startsWith("-")) {
			throw new Error(`Unknown option: ${arg}`);
		}
		if (command === null) {
			command = arg;
			continue;
		}
		throw new Error(`Unexpected argument: ${arg}`);
	}

	return {
		command,
		checkOnly,
		projectRoot,
		schemaPartitionPath,
		contentConfigPath,
		help,
	};
}

async function main(): Promise<number> {
	const parsed = parseArgs(process.argv.slice(2));

	if (parsed.help) {
		printHelp();
		return 0;
	}

	if (parsed.command === null) {
		printHelp();
		return 1;
	}

	if (parsed.command !== "generate") {
		process.stderr.write(`Unknown command: ${parsed.command}\n\n`);
		printHelp();
		return 1;
	}

	const result = await generateContentConfig({
		projectRoot: parsed.projectRoot,
		schemaPartitionPath: parsed.schemaPartitionPath,
		contentConfigPath: parsed.contentConfigPath,
		checkOnly: parsed.checkOnly,
	});

	if (parsed.checkOnly) {
		if (result.stale) {
			process.stderr.write(
				`content.config is stale or missing (expected hash ${result.sourceHash.slice(0, 12)}…)\n` +
					`Run: cms generate --root ${parsed.projectRoot}\n`,
			);
			return 1;
		}
		process.stdout.write(
			`content.config up to date (${result.sourceHash.slice(0, 12)}…)\n`,
		);
		return 0;
	}

	if (result.wrote) {
		process.stdout.write(
			`Wrote ${result.contentConfigPath} (${result.sourceHash.slice(0, 12)}…)\n`,
		);
	} else {
		process.stdout.write(
			`Unchanged ${result.contentConfigPath} (${result.sourceHash.slice(0, 12)}…)\n`,
		);
	}
	return 0;
}

main()
	.then((code) => {
		process.exit(code);
	})
	.catch((err: unknown) => {
		const message = err instanceof Error ? err.message : String(err);
		process.stderr.write(`${message}\n`);
		process.exit(1);
	});
