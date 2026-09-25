/**
 * Pack @cms/core, @cms/authoring, @cms/astro and install their .tgz into a
 * scratch Astro consumer (no workspace Vite hacks). Day-to-day demos stay
 * workspace:* — this is publish-face validation only.
 *
 * Usage: bun run smoke:publish-face
 */
import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const PACK_SCRIPTS = ["pack:core", "pack:authoring", "pack:astro"] as const;

const PACKAGES = {
	"@cms/core": "packages/core",
	"@cms/authoring": "packages/authoring",
	"@cms/astro": "packages/astro",
} as const;

type PackageJson = {
	workspaces?: { catalog?: Record<string, string> };
	[key: string]: unknown;
};

function step(msg: string): void {
	console.log(`\n==> ${msg}`);
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
	const rootPkg = JSON.parse(
		readFileSync(path.join(root, "package.json"), "utf8"),
	) as PackageJson;
	return rootPkg.workspaces?.catalog ?? {};
}

function catalogRange(catalog: Record<string, string>, name: string): string {
	const range = catalog[name];
	if (!range) throw new Error(`No catalog entry for ${name}`);
	return range;
}

/** `@cms/core` → tarball prefix `cms-core-`. */
function tarballPrefix(pkgName: string): string {
	return `${pkgName.replace(/^@/, "").replace("/", "-")}-`;
}

function findTarball(pkgDir: string, pkgName: string): string | null {
	const abs = path.join(root, pkgDir);
	let entries: string[];
	try {
		entries = readdirSync(abs);
	} catch {
		return null;
	}
	const prefix = tarballPrefix(pkgName);
	const matches = entries
		.filter((e) => e.startsWith(prefix) && e.endsWith(".tgz"))
		.sort();
	const last = matches.at(-1);
	return last ? path.join(abs, last) : null;
}

function resolveTarballs(): Record<keyof typeof PACKAGES, string | null> {
	return {
		"@cms/core": findTarball(PACKAGES["@cms/core"], "@cms/core"),
		"@cms/authoring": findTarball(PACKAGES["@cms/authoring"], "@cms/authoring"),
		"@cms/astro": findTarball(PACKAGES["@cms/astro"], "@cms/astro"),
	};
}

function assertTarballs(
	tarballs: Record<keyof typeof PACKAGES, string | null>,
): asserts tarballs is Record<keyof typeof PACKAGES, string> {
	const missing = (
		Object.entries(tarballs) as [keyof typeof PACKAGES, string | null][]
	)
		.filter(([, p]) => !p)
		.map(([name]) => name);
	if (missing.length === 0) return;
	const hints = missing
		.map((name) => {
			const dir = PACKAGES[name];
			return `  ${name}: expected ${dir}/${tarballPrefix(name)}*.tgz`;
		})
		.join("\n");
	throw new Error(
		`Missing publish-face tarball(s):\n${hints}\n` +
			`Ensure bun run pack:core / pack:authoring / pack:astro succeed.`,
	);
}

function sleepSeconds(seconds: number): void {
	spawnSync("sleep", [String(seconds)], { stdio: "ignore" });
}

function scaffold(
	appDir: string,
	tarballs: Record<keyof typeof PACKAGES, string>,
): void {
	const catalog = catalogVersions();
	const tgzDir = path.join(appDir, "tarballs");
	mkdirSync(tgzDir, { recursive: true });

	const localTgz: Record<keyof typeof PACKAGES, string> = {
		"@cms/core": "",
		"@cms/authoring": "",
		"@cms/astro": "",
	};
	for (const name of Object.keys(PACKAGES) as (keyof typeof PACKAGES)[]) {
		const src = tarballs[name];
		const dest = path.join(tgzDir, path.basename(src));
		cpSync(src, dest);
		localTgz[name] = `./tarballs/${path.basename(src)}`;
	}

	const pkg = {
		name: "cms-smoke-publish-face",
		private: true,
		type: "module",
		scripts: {
			check: "astro check",
		},
		dependencies: {
			"@astrojs/svelte": catalogRange(catalog, "@astrojs/svelte"),
			"@cms/astro": localTgz["@cms/astro"],
			"@cms/authoring": localTgz["@cms/authoring"],
			"@cms/core": localTgz["@cms/core"],
			astro: catalogRange(catalog, "astro"),
			svelte: catalogRange(catalog, "svelte"),
			zod: catalogRange(catalog, "zod"),
		},
		devDependencies: {
			"@astrojs/check": "^0.9.10",
			typescript: catalogRange(catalog, "typescript"),
		},
		// Nested deps inside packed @cms/* must resolve to these tarballs, not the registry.
		overrides: {
			"@cms/core": localTgz["@cms/core"],
			"@cms/authoring": localTgz["@cms/authoring"],
		},
	};
	writeFileSync(
		path.join(appDir, "package.json"),
		`${JSON.stringify(pkg, null, "\t")}\n`,
	);

	writeFileSync(
		path.join(appDir, "astro.config.mjs"),
		`import svelte from "@astrojs/svelte";
import { cms } from "@cms/astro";
import { defineConfig } from "astro/config";

// Publish-face smoke: no monorepo Vite ssr.noExternal / optimizeDeps.exclude.
export default defineConfig({
	integrations: [svelte(), cms()],
});
`,
	);

	writeFileSync(
		path.join(appDir, "tsconfig.json"),
		`${JSON.stringify(
			{
				extends: "astro/tsconfigs/strict",
				compilerOptions: {
					customConditions: ["svelte"],
				},
				exclude: ["dist"],
			},
			null,
			"\t",
		)}\n`,
	);

	mkdirSync(path.join(appDir, "src"), { recursive: true });
	writeFileSync(
		path.join(appDir, "src", "env.d.ts"),
		`/// <reference types="astro/client" />
`,
	);

	const demo = path.join(root, "demos", "astro-simple");
	cpSync(
		path.join(demo, "src", "content.config.ts"),
		path.join(appDir, "src", "content.config.ts"),
	);

	mkdirSync(path.join(appDir, "src", "pages"), { recursive: true });
	writeFileSync(
		path.join(appDir, "src", "pages", "index.astro"),
		`---
---

<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>publish-face smoke</title>
	</head>
	<body>
		<h1>publish-face smoke</h1>
	</body>
</html>
`,
	);

	mkdirSync(path.join(appDir, "src", "content", "authors"), {
		recursive: true,
	});
	mkdirSync(path.join(appDir, "src", "content", "posts"), { recursive: true });
	cpSync(
		path.join(demo, "src", "content", "authors", "ada.json"),
		path.join(appDir, "src", "content", "authors", "ada.json"),
	);
	writeFileSync(
		path.join(appDir, "src", "content", "posts", "hello.json"),
		`${JSON.stringify(
			{
				title: "Hello",
				draft: true,
				body: "publish-face smoke entry",
				author: "ada",
			},
			null,
			"\t",
		)}\n`,
	);
}

function packAll(): void {
	for (const script of PACK_SCRIPTS) {
		step(`Running bun run ${script}`);
		run(["bun", "run", script], root);
	}
}

function main(): void {
	step("Packing @cms/core → @cms/authoring → @cms/astro");
	try {
		packAll();
	} catch (err) {
		const tarballs = resolveTarballs();
		if (!tarballs["@cms/astro"]) {
			console.error(
				"\npack:astro failed or is not wired yet. " +
					"Expected root script `pack:astro` and packages/astro/cms-astro-*.tgz.",
			);
		}
		throw err;
	}

	let tarballs = resolveTarballs();
	if (!tarballs["@cms/astro"]) {
		step("Astro tarball missing; waiting 5s and retrying pack:astro once");
		sleepSeconds(5);
		run(["bun", "run", "pack:astro"], root);
		tarballs = resolveTarballs();
	}
	assertTarballs(tarballs);

	for (const [name, file] of Object.entries(tarballs)) {
		console.log(`  ${name}: ${path.relative(root, file)}`);
	}

	const smokeRoot = path.join(root, ".smoke-publish-face");
	mkdirSync(smokeRoot, { recursive: true });
	const appDir = mkdtempSync(path.join(smokeRoot, "app-"));
	let passed = false;

	try {
		step(`Scaffolding scratch consumer at ${appDir}`);
		scaffold(appDir, tarballs);

		step("bun install (file: tarballs + catalog peers)");
		run(["bun", "install"], appDir);

		step("astro check");
		run(["bun", "run", "check"], appDir);

		passed = true;
		step("smoke:publish-face passed");
	} catch (err) {
		console.error(
			`\nsmoke:publish-face FAILED — scratch kept for debug:\n  ${appDir}\n`,
		);
		throw err;
	} finally {
		if (passed) {
			rmSync(appDir, { recursive: true, force: true });
		}
	}
}

try {
	main();
} catch (err) {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
}
