/**
 * Build a workspace package, then pack a publish face from a staging dir.
 *
 * Workspace `package.json` stays on `src/` + `catalog:` / `workspace:*`.
 * Staging gets a fresh publish `package.json` (dist exports + concrete versions).
 * Never mutates the live workspace face.
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

type PackConfig = {
	dir: string;
	build: string[];
	exportMap: () => PackageJson["exports"];
};

/** Publish export maps — single source for the packed face (not the workspace face). */
const PACKAGES: Record<string, PackConfig> = {
	"@cms/core": {
		dir: "packages/core",
		build: ["bunx", "tsdown"],
		exportMap: () => ({
			".": {
				types: "./dist/index.d.ts",
				import: "./dist/index.js",
			},
			"./define-cms": {
				types: "./dist/define-cms/define-cms.d.ts",
				import: "./dist/define-cms/define-cms.js",
			},
			"./fetch-client": {
				types: "./dist/protocol/fetch-client.d.ts",
				import: "./dist/protocol/fetch-client.js",
			},
			"./form-tree": {
				types: "./dist/form-tree/form-tree.d.ts",
				import: "./dist/form-tree/form-tree.js",
			},
			"./http": {
				types: "./dist/http/index.d.ts",
				import: "./dist/http/index.js",
			},
			"./node": {
				types: "./dist/node.d.ts",
				import: "./dist/node.js",
			},
			"./protocol": {
				types: "./dist/protocol/protocol.d.ts",
				import: "./dist/protocol/protocol.js",
			},
			"./semantic": {
				types: "./dist/semantic/index.d.ts",
				import: "./dist/semantic/index.js",
			},
		}),
	},
	"@cms/authoring": {
		dir: "packages/authoring",
		build: ["bunx", "svelte-package", "-i", "src", "-o", "dist"],
		exportMap: () => ({
			".": {
				types: "./dist/index.d.ts",
				svelte: "./dist/index.js",
				import: "./dist/index.js",
			},
			"./config": {
				types: "./dist/config/index.d.ts",
				svelte: "./dist/config/index.js",
				import: "./dist/config/index.js",
			},
		}),
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

function pruneDist(distDir: string): void {
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

run(cfg.build, pkgDir);
pruneDist(path.join(pkgDir, "dist"));

rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });
cpSync(path.join(pkgDir, "dist"), path.join(stagingDir, "dist"), {
	recursive: true,
});

const publishPkg = publishPackageJson(
	readJson(pkgPath),
	cfg.exportMap(),
	catalog,
);
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
