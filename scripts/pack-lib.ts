/**
 * Build a workspace package, then pack a publish face from a staging dir.
 *
 * Workspace `package.json` stays on `src/` + `catalog:` / `workspace:*`.
 * Staging gets a fresh publish `package.json` (dist exports + concrete versions)
 * derived from the workspace `exports` map — one source of truth for subpaths.
 * Never mutates the live workspace face.
 *
 * Authoring keeps tests colocated under `src/`. `@sveltejs/package` has no
 * exclude, so {@link filterPublishDist} strips test/fixture emit before pack.
 *
 * Usage: bun run scripts/pack-lib.ts @cms/core | @cms/authoring
 */
import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const STAGING = ".pack";

type PackageJson = {
	name?: string;
	version?: string;
	private?: boolean;
	exports?: unknown;
	files?: string[];
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	scripts?: unknown;
	[key: string]: unknown;
};

type PublishExport = {
	types: string;
	import: string;
	svelte?: string;
};

type PackConfig = {
	dir: string;
	build: string[];
	/** Add a `svelte` condition pointing at the same JS as `import` (authoring). */
	svelteCondition?: boolean;
};

const PACKAGES: Record<string, PackConfig> = {
	"@cms/core": {
		dir: "packages/core",
		build: ["bunx", "tsdown"],
	},
	"@cms/authoring": {
		dir: "packages/authoring",
		build: ["bunx", "svelte-package", "-i", "src", "-o", "dist"],
		svelteCondition: true,
	},
};

function readJson(file: string): PackageJson {
	return JSON.parse(readFileSync(file, "utf8")) as PackageJson;
}

function run(cmd: string[], cwd: string): void {
	const [bin, ...args] = cmd;
	if (!bin) throw new Error("empty command");
	const result = spawnSync(bin, args, {
		cwd,
		stdio: "inherit",
		env: process.env,
	});
	if (result.status !== 0) {
		throw new Error(`Command failed (${result.status}): ${cmd.join(" ")}`);
	}
}

function catalogVersions(): Record<string, string> {
	const rootPkg = readJson(path.join(root, "package.json"));
	const workspaces = rootPkg.workspaces as
		| { catalog?: Record<string, string> }
		| undefined;
	return workspaces?.catalog ?? {};
}

function workspaceVersion(depName: string): string {
	const cfg = PACKAGES[depName];
	if (!cfg) throw new Error(`Unknown workspace package: ${depName}`);
	const pkg = readJson(path.join(root, cfg.dir, "package.json"));
	if (!pkg.version) throw new Error(`${depName} has no version`);
	return pkg.version;
}

function rewriteDeps(
	deps: Record<string, string> | undefined,
	catalog: Record<string, string>,
): Record<string, string> | undefined {
	if (!deps) return undefined;
	const out: Record<string, string> = {};
	for (const [depName, spec] of Object.entries(deps)) {
		if (spec === "workspace:*") {
			out[depName] = workspaceVersion(depName);
			continue;
		}
		if (spec.startsWith("workspace:")) {
			const target = spec.slice("workspace:".length);
			out[depName] = workspaceVersion(target);
			continue;
		}
		if (spec === "catalog:" || spec.startsWith("catalog:")) {
			const key = spec === "catalog:" ? depName : spec.slice("catalog:".length);
			const range = catalog[key];
			if (!range) throw new Error(`No catalog entry for ${key}`);
			out[depName] = range;
			continue;
		}
		out[depName] = spec;
	}
	return out;
}

/** Workspace face: subpath → `./src/….ts`. */
function workspaceSrcExports(
	exportsField: unknown,
	pkgLabel: string,
): Record<string, string> {
	if (
		!exportsField ||
		typeof exportsField !== "object" ||
		Array.isArray(exportsField)
	) {
		throw new Error(`${pkgLabel}: exports must be a map of ./src/*.ts paths`);
	}
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(exportsField)) {
		if (typeof value !== "string") {
			throw new Error(
				`${pkgLabel} export "${key}": expected string path, got ${typeof value}`,
			);
		}
		if (!value.startsWith("./src/") || !value.endsWith(".ts")) {
			throw new Error(
				`${pkgLabel} export "${key}": expected ./src/*.ts, got ${value}`,
			);
		}
		out[key] = value;
	}
	return out;
}

/** Publish face: rewrite `./src/foo.ts` → dist types/import (+ optional svelte). */
function publishExportsFromSrc(
	srcExports: Record<string, string>,
	opts: { svelte?: boolean } = {},
): Record<string, PublishExport> {
	const out: Record<string, PublishExport> = {};
	for (const [key, srcPath] of Object.entries(srcExports)) {
		const rel = srcPath.slice("./src/".length, -".ts".length);
		const base = `./dist/${rel}`;
		const entry: PublishExport = {
			types: `${base}.d.ts`,
			import: `${base}.js`,
		};
		if (opts.svelte) entry.svelte = `${base}.js`;
		out[key] = entry;
	}
	return out;
}

/**
 * Owned publish filter (post-emit): drop colocated test/fixture artifacts from
 * `dist` so the tarball never ships them. Harmless when the build already
 * emits public entries only (e.g. core `tsdown`).
 */
function filterPublishDist(distDir: string): void {
	const stack: string[] = [distDir];
	while (stack.length > 0) {
		const dir = stack.pop();
		if (dir === undefined) break;
		for (const entry of readdirSync(dir)) {
			const full = path.join(dir, entry);
			const st = statSync(full);
			if (st.isDirectory()) {
				if (entry === "testing") {
					rmSync(full, { recursive: true, force: true });
					continue;
				}
				stack.push(full);
				continue;
			}
			if (
				/\.(test|spec|fixtures)\./.test(entry) ||
				entry.endsWith(".fixtures.js")
			) {
				rmSync(full, { force: true });
			}
		}
	}
}

function publishPackageJson(
	workspacePkg: PackageJson,
	exportMap: PackageJson["exports"],
	catalog: Record<string, string>,
): PackageJson {
	const pkg: PackageJson = { ...workspacePkg };
	pkg.private = false;
	pkg.files = ["dist"];
	pkg.exports = exportMap;
	pkg.dependencies = rewriteDeps(pkg.dependencies, catalog);
	pkg.peerDependencies = rewriteDeps(pkg.peerDependencies, catalog);
	delete pkg.devDependencies;
	delete pkg.scripts;
	return pkg;
}

const name = process.argv[2];
const cfg = name ? PACKAGES[name] : undefined;
if (!cfg) {
	console.error(
		`Usage: bun run scripts/pack-lib.ts <${Object.keys(PACKAGES).join("|")}>`,
	);
	process.exit(1);
}

const pkgDir = path.join(root, cfg.dir);
const pkgPath = path.join(pkgDir, "package.json");
const stagingDir = path.join(pkgDir, STAGING);
const catalog = catalogVersions();
const workspacePkg = readJson(pkgPath);
const publishExports = publishExportsFromSrc(
	workspaceSrcExports(workspacePkg.exports, name),
	{ svelte: cfg.svelteCondition },
);

run(cfg.build, pkgDir);
filterPublishDist(path.join(pkgDir, "dist"));

rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });
cpSync(path.join(pkgDir, "dist"), path.join(stagingDir, "dist"), {
	recursive: true,
});

const publishPkg = publishPackageJson(workspacePkg, publishExports, catalog);
writeFileSync(
	path.join(stagingDir, "package.json"),
	`${JSON.stringify(publishPkg, null, "\t")}\n`,
);

try {
	run(["bun", "pm", "pack"], stagingDir);
	for (const entry of readdirSync(stagingDir)) {
		if (!entry.endsWith(".tgz")) continue;
		renameSync(path.join(stagingDir, entry), path.join(pkgDir, entry));
	}
} finally {
	rmSync(stagingDir, { recursive: true, force: true });
}

console.log(
	`Packed ${name} (staging dir cleaned; workspace package.json untouched).`,
);
