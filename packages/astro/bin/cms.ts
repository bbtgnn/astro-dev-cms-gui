#!/usr/bin/env bun
/**
 * `cms` CLI — schema-first overlay branch.
 *
 * - `cms sync` — emit CMS Input types from content.config
 * - `cms generate` — removed (hard-fail)
 */

import path from "node:path";
import { syncCmsCollectionTypes } from "../src/codegen/sync-collection-types.ts";

function printHelp(): void {
	process.stdout.write(`Usage:
  cms sync       Emit src/cms.types.d.ts from content.config (CMS Input types)
  cms generate   (removed)

Hand-authored src/content.config.ts + optional defineCms(options) overlay.
`);
}

async function main(): Promise<number> {
	const argv = process.argv.slice(2);
	if (argv.includes("-h") || argv.includes("--help") || argv.length === 0) {
		printHelp();
		return argv.length === 0 ? 1 : 0;
	}

	const command = argv.find((a) => !a.startsWith("-")) ?? null;
	if (command === "generate") {
		process.stderr.write(
			"cms generate was removed on this branch (schema-first overlay).\n" +
				"Author src/content.config.ts directly; run cms sync for overlay types.\n",
		);
		return 1;
	}

	if (command === "sync") {
		const root = process.cwd();
		const result = await syncCmsCollectionTypes({ projectRoot: root });
		process.stdout.write(
			`Wrote ${path.relative(root, result.outFile)} (${result.collectionNames.join(", ")})\n`,
		);
		return 0;
	}

	process.stderr.write(
		command != null
			? `Unknown command: ${command}\n\n`
			: "No command given.\n\n",
	);
	printHelp();
	return 1;
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
