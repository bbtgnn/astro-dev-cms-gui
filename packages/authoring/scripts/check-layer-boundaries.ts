/**
 * Architecture check (ADR-0008 / ADR-0018): the authoring UI must not import
 * Astro, Node, filesystem, serializers, image-processing, or Git.
 *
 * Run: bun run packages/authoring/scripts/check-layer-boundaries.ts
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
	fileURLToPath(new URL(".", import.meta.url)),
	"..",
);
const srcRoot = path.join(packageRoot, "src");

/** Forbidden import targets / prefixes (specifier after from/import). */
const FORBIDDEN: Array<{ id: string; pattern: RegExp }> = [
	{ id: "astro", pattern: /^astro(?:\/|$|:)/ },
	{ id: "node", pattern: /^node:/ },
	{ id: "filesystem", pattern: /^(?:fs|fs\/promises|path|node:fs|node:path)$/ },
	{ id: "serializer", pattern: /^(?:js-yaml)$/ },
	{ id: "image-processing", pattern: /^sharp$/ },
	{
		id: "git",
		pattern: /^(?:simple-git|isomorphic-git|@isomorphic-git\/)/,
	},
	/** Host package — not for browser authoring UI. */
	{ id: "host-astro", pattern: /^@cms\/astro(?:\/|$)/ },
	/**
	 * `@cms/core` root re-exports Node FS writers; browser code must use
	 * `@cms/core/fetch-client`, `@cms/core/protocol`, or `@cms/core/semantic`
	 * (IR builders; no Svelte). Authoring config contracts live in
	 * `@cms/authoring/config` and may import semantic only.
	 */
	{ id: "core-root", pattern: /^@cms\/core$/ },
];

const IMPORT_RE =
	/(?:from\s+|import\s*\(\s*)["']([^"']+)["']|require\s*\(\s*["']([^"']+)["']\s*\)/g;

async function listSourceFiles(dir: string): Promise<string[]> {
	const out: string[] = [];
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...(await listSourceFiles(full)));
			continue;
		}
		if (/\.(ts|js|svelte)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
			out.push(full);
		}
	}
	return out;
}

function extractSpecifiers(source: string): string[] {
	const specs: string[] = [];
	for (const match of source.matchAll(IMPORT_RE)) {
		const spec = match[1] ?? match[2];
		if (spec) specs.push(spec);
	}
	return specs;
}

const files = await listSourceFiles(srcRoot);
const failures: string[] = [];

for (const file of files) {
	const source = await readFile(file, "utf8");
	const rel = path.relative(packageRoot, file);
	for (const spec of extractSpecifiers(source)) {
		if (spec.startsWith(".") || spec.startsWith("virtual:")) continue;
		for (const rule of FORBIDDEN) {
			if (rule.pattern.test(spec)) {
				failures.push(`${rel}: forbidden ${rule.id} import "${spec}"`);
			}
		}
	}
}

if (failures.length > 0) {
	console.error("authoring layer-boundary check FAILED:");
	for (const f of failures) console.error(`  ${f}`);
	process.exit(1);
}

console.log(
	`authoring layer-boundary check passed (${files.length} source file(s))`,
);
