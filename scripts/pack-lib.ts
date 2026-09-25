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
 * Import: `packLib(name)` / `packAll()` → absolute tarball path(s).
 * CLI: bun run scripts/pack-lib.ts @cms/core | @cms/authoring | @cms/astro
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
	bin?: string | Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	scripts?: unknown;
	[key: string]: unknown;
};

type PublishExport = {
	types?: string;
	import: string;
	svelte?: string;
	default?: string;
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
	"@cms/astro": {
		dir: "packages/astro",
		build: ["bunx", "tsdown"],
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

/** Workspace face: subpath → `./src/…` (.ts / .astro / .svelte). */
function workspaceSrcExports(
	exportsField: unknown,
	pkgLabel: string,
): Record<string, string> {
	if (
		!exportsField ||
		typeof exportsField !== "object" ||
		Array.isArray(exportsField)
	) {
		throw new Error(
			`${pkgLabel}: exports must be a map of ./src/* string paths`,
		);
	}
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(exportsField)) {
		if (typeof value !== "string") {
			throw new Error(
				`${pkgLabel} export "${key}": expected string path, got ${typeof value}`,
			);
		}
		if (!value.startsWith("./src/")) {
			throw new Error(
				`${pkgLabel} export "${key}": expected ./src/*, got ${value}`,
			);
		}
		if (
			!value.endsWith(".ts") &&
			!value.endsWith(".astro") &&
			!value.endsWith(".svelte")
		) {
			throw new Error(
				`${pkgLabel} export "${key}": expected ./src/*.{ts,astro,svelte}, got ${value}`,
			);
		}
		out[key] = value;
	}
	return out;
}

/** Publish face: rewrite `./src/foo.*` → dist conditions by extension. */
function publishExportsFromSrc(
	srcExports: Record<string, string>,
	opts: { svelte?: boolean } = {},
): Record<string, PublishExport> {
	const out: Record<string, PublishExport> = {};
	for (const [key, srcPath] of Object.entries(srcExports)) {
		if (srcPath.endsWith(".astro")) {
			const distPath = `./dist/${srcPath.slice("./src/".length)}`;
			out[key] = { import: distPath, default: distPath };
			continue;
		}
		if (srcPath.endsWith(".svelte")) {
			const distPath = `./dist/${srcPath.slice("./src/".length)}`;
			out[key] = {
				svelte: distPath,
				import: distPath,
				default: distPath,
			};
			continue;
		}
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

/** Workspace `./src/foo.ts` → publish `./dist/foo.js` (e.g. `cms` bin). */
function rewriteBinPath(binPath: string): string {
	if (binPath.startsWith("./src/") && binPath.endsWith(".ts")) {
		return `./dist/${binPath.slice("./src/".length, -".ts".length)}.js`;
	}
	throw new Error(
		`publish bin must be ./src/*.ts (got ${binPath}); point package.json bin at src`,
	);
}

function rewriteBin(bin: PackageJson["bin"]): PackageJson["bin"] | undefined {
	if (bin == null) return undefined;
	if (typeof bin === "string") return rewriteBinPath(bin);
	const out: Record<string, string> = {};
	for (const [name, binPath] of Object.entries(bin)) {
		out[name] = rewriteBinPath(binPath);
	}
	return out;
}

/**
 * Owned publish filter (post-emit): drop colocated test/fixture artifacts from
 * `dist` so the tarball never ships them. Harmless when the build already
 * emits public entries only (e.g. core `tsdown`). Does not strip public
 * export files named `testing.*`.
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
				if (entry === "testing" || entry === "fixtures") {
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
	const bin = rewriteBin(workspacePkg.bin);
	if (bin != null) pkg.bin = bin;
	delete pkg.devDependencies;
	delete pkg.scripts;
	return pkg;
}

/** Pack one named workspace package; return absolute path of the `.tgz`. */
export function packLib(name: string): string {
	const cfg = PACKAGES[name];
	if (!cfg) {
		throw new Error(
			`Unknown package ${name}; expected one of ${Object.keys(PACKAGES).join(", ")}`,
		);
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
		const tarballs = readdirSync(stagingDir).filter((entry) =>
			entry.endsWith(".tgz"),
		);
		const entry = tarballs[0];
		if (tarballs.length !== 1 || entry === undefined) {
			throw new Error(
				`${name}: expected exactly one .tgz from bun pm pack, got ${tarballs.length}`,
			);
		}
		const tarballPath = path.join(pkgDir, entry);
		renameSync(path.join(stagingDir, entry), tarballPath);
		return tarballPath;
	} finally {
		rmSync(stagingDir, { recursive: true, force: true });
	}
}

/** Pack every known workspace package; return absolute `.tgz` paths in inventory order. */
export function packAll(): string[] {
	return Object.keys(PACKAGES).map((name) => packLib(name));
}

if (import.meta.main) {
	const name = process.argv[2];
	if (!name || !(name in PACKAGES)) {
		console.error(
			`Usage: bun run scripts/pack-lib.ts <${Object.keys(PACKAGES).join("|")}>`,
		);
		process.exit(1);
	}
	packLib(name);
	console.log(
		`Packed ${name} (staging dir cleaned; workspace package.json untouched).`,
	);
}
