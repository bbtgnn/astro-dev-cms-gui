#!/usr/bin/env bun
/**
 * `cms` CLI — generation removed on the schema-first overlay branch.
 *
 * Product path: hand-authored `src/content.config.ts` + optional overlay.
 * Leftover `cms generate` scripts (e.g. `@cms/astro-template`) hard-fail here
 * until ticket 09 deletes that package.
 */

function printHelp(): void {
	process.stdout.write(`Usage:
  cms generate   (removed)

cms generate / content.config emission from IR was removed on this branch.
Use a hand-authored src/content.config.ts and optional defineCms(collections, overlay).
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
				"Author src/content.config.ts directly; optional overlay via defineCms(collections, config).\n",
		);
		return 1;
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
