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
 * Import: `packLib(name)` / `packAll()` → named tarball record(s).
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
import {
	assertPublishFace,
	createPublishFace,
	type PackageJson,
} from "./publish-face-contract.ts";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const STAGING = ".pack";

type PackConfig = {
	dir: string;
	build: string[];
	/** Add a `svelte` condition pointing at the same JS as `import` (authoring). */
	svelteCondition?: boolean;
};

const PACKAGES = {
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
} satisfies Record<string, PackConfig>;

export type PublishPackageName = keyof typeof PACKAGES;

export type PackedTarball = {
	readonly name: PublishPackageName;
	readonly tarballPath: string;
};

export function publishPackageNames(): PublishPackageName[] {
	return Object.keys(PACKAGES) as PublishPackageName[];
}

function isPublishPackageName(name: string): name is PublishPackageName {
	return name in PACKAGES;
}

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

/** Pack one named workspace package; return its absolute `.tgz` path. */
export function packLib(name: PublishPackageName): PackedTarball {
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
	run(cfg.build, pkgDir);
	filterPublishDist(path.join(pkgDir, "dist"));

	rmSync(stagingDir, { recursive: true, force: true });
	mkdirSync(stagingDir, { recursive: true });
	cpSync(path.join(pkgDir, "dist"), path.join(stagingDir, "dist"), {
		recursive: true,
	});

	const publishPkg = createPublishFace(workspacePkg, {
		packageName: name,
		catalog,
		workspaceVersion,
		svelteCondition: cfg.svelteCondition,
	});
	assertPublishFace(path.join(pkgDir, "dist"), publishPkg);
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
		return { name, tarballPath };
	} finally {
		rmSync(stagingDir, { recursive: true, force: true });
	}
}

/** Pack every known workspace package; preserve identity with each `.tgz` path. */
export function packAll(): PackedTarball[] {
	return publishPackageNames().map((name) => packLib(name));
}

if (import.meta.main) {
	const name = process.argv[2];
	if (!name || !isPublishPackageName(name)) {
		console.error(
			`Usage: bun run scripts/pack-lib.ts <${publishPackageNames().join("|")}>`,
		);
		process.exit(1);
	}
	packLib(name);
	console.log(
		`Packed ${name} (staging dir cleaned; workspace package.json untouched).`,
	);
}
