/**
 * Issue #33: isomorphic `@cms/core` subpaths must not pull Node built-ins.
 *
 * Walks the static import graph from fetch-client / protocol / semantic.
 * Run: bun run packages/core/scripts/check-isomorphic-boundary.ts
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
	fileURLToPath(new URL(".", import.meta.url)),
	"..",
);
const srcRoot = path.join(packageRoot, "src");

const ENTRYPOINTS = [
	"protocol/fetch-client.ts",
	"protocol/protocol.ts",
	"protocol/create-cms-host.ts",
	"semantic/index.ts",
] as const;

const FORBIDDEN = /^node:(?:fs|path|crypto)(?:\/|$)/;

function extractValueSpecifiers(source: string): string[] {
	const specs: string[] = [];
	// Drop type-only import/export forms so value-graph walks stay accurate.
	const code = source
		.replace(/^\s*import\s+type\s+[\s\S]*?;\s*$/gm, "")
		.replace(/^\s*export\s+type\s+[\s\S]*?;\s*$/gm, "");

	for (const match of code.matchAll(
		/\b(?:import|export)\s+(?!type\b)[\s\S]*?\bfrom\s+["']([^"']+)["']/g,
	)) {
		if (match[1]) specs.push(match[1]);
	}
	for (const match of code.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) {
		if (match[1]) specs.push(match[1]);
	}
	return specs;
}

function resolveRelative(fromFile: string, spec: string): string | null {
	if (!spec.startsWith(".")) return null;
	const base = path.resolve(path.dirname(fromFile), spec);
	if (base.endsWith(".ts") || base.endsWith(".js")) return base;
	return `${base}.ts`;
}

const visited = new Set<string>();
const failures: string[] = [];
const queue = ENTRYPOINTS.map((rel) => path.join(srcRoot, rel));

while (queue.length > 0) {
	const file = queue.pop();
	if (!file || visited.has(file)) continue;
	visited.add(file);

	let source: string;
	try {
		source = await readFile(file, "utf8");
	} catch {
		failures.push(`missing module: ${path.relative(packageRoot, file)}`);
		continue;
	}

	const rel = path.relative(packageRoot, file);
	for (const spec of extractValueSpecifiers(source)) {
		if (FORBIDDEN.test(spec)) {
			failures.push(`${rel}: forbidden import "${spec}"`);
			continue;
		}
		const next = resolveRelative(file, spec);
		if (next && !visited.has(next)) queue.push(next);
	}
}

if (failures.length > 0) {
	console.error("isomorphic boundary check FAILED:");
	for (const f of failures) console.error(`  ${f}`);
	process.exit(1);
}

console.log(
	`isomorphic boundary check passed (${visited.size} module(s) from ${ENTRYPOINTS.length} entr(y/ies))`,
);
