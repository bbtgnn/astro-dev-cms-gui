/**
 * Verify publish-face tarballs in a scratch Astro consumer (no workspace Vite
 * hacks). Day-to-day demos stay workspace:* — this is publish-face validation.
 *
 * Import: `verifyPublishFace(tarballs)` — named absolute `.tgz` paths from
 * `packAll()`.
 * CLI: bun run smoke:publish-face → packAll() then verify.
 */
import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	type PackedTarball,
	type PublishPackageName,
	packAll,
	publishPackageNames,
} from "./pack-lib.ts";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

type CmsPackage = PublishPackageName;

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

export function tarballsByPackage(
	packedTarballs: readonly PackedTarball[],
): Record<CmsPackage, string> {
	const names = publishPackageNames();
	if (packedTarballs.length !== names.length) {
		throw new Error(
			`Expected ${names.length} named tarballs (${names.join(", ")}), got ${packedTarballs.length}`,
		);
	}
	const expected = new Set<CmsPackage>(names);
	const out: Partial<Record<CmsPackage, string>> = {};
	for (const { name, tarballPath } of packedTarballs) {
		if (!expected.has(name)) {
			throw new Error(`Unexpected publish tarball for ${name}`);
		}
		if (out[name] !== undefined) {
			throw new Error(`Duplicate publish tarball for ${name}`);
		}
		if (!tarballPath) {
			throw new Error(`Missing tarball path for ${name}`);
		}
		out[name] = tarballPath;
	}
	for (const name of names) {
		if (out[name] === undefined) {
			throw new Error(`Missing publish tarball for ${name}`);
		}
	}
	return out as Record<CmsPackage, string>;
}

function scaffold(appDir: string, tarballs: Record<CmsPackage, string>): void {
	const catalog = catalogVersions();
	const tgzDir = path.join(appDir, "tarballs");
	mkdirSync(tgzDir, { recursive: true });

	const localTgz = {} as Record<CmsPackage, string>;
	for (const name of publishPackageNames()) {
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

/**
 * Scaffold a scratch Astro consumer from publish-face tarballs, install, and
 * run `astro check`. Scratch under `.smoke-publish-face/` is removed on
 * success and kept on failure.
 *
 * @param tarballs Named absolute `.tgz` paths returned by `packAll()`.
 */
export function verifyPublishFace(tarballs: readonly PackedTarball[]): void {
	const tarballsByName = tarballsByPackage(tarballs);

	for (const name of publishPackageNames()) {
		console.log(`  ${name}: ${path.relative(root, tarballsByName[name])}`);
	}

	const smokeRoot = path.join(root, ".smoke-publish-face");
	mkdirSync(smokeRoot, { recursive: true });
	const appDir = mkdtempSync(path.join(smokeRoot, "app-"));
	let passed = false;

	try {
		step(`Scaffolding scratch consumer at ${appDir}`);
		scaffold(appDir, tarballsByName);

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

function main(): void {
	step("Packing @cms/core → @cms/authoring → @cms/astro");
	const tarballs = packAll();
	step("Verifying publish face in scratch consumer");
	verifyPublishFace(tarballs);
}

if (import.meta.main) {
	try {
		main();
	} catch (err) {
		console.error(err instanceof Error ? err.message : err);
		process.exit(1);
	}
}
