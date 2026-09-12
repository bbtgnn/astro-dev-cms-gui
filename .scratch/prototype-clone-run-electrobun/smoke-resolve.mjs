/**
 * PROTOTYPE smoke — no Electrobun UI. Verifies bun/WIP resolution against a
 * packaged .app layout (or the live process when ELECTROBUN_APP is unset).
 *
 * Usage:
 *   bun smoke-resolve.mjs
 *   bun smoke-resolve.mjs ./build/dev-macos-arm64/CloneRunElectrobunPrototype-dev.app
 */
import {
	accessSync,
	constants,
	existsSync,
	statSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function isExecutableFile(path) {
	try {
		if (!statSync(path).isFile()) return false;
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

function looksLikeBunBinary(path) {
	const base = path.split(/[/\\]/).pop()?.toLowerCase() ?? "";
	return base === "bun" || base === "bun.exe" || base.includes("bun");
}

function isInsideAppResources(path) {
	return /[/\\][^/\\]+\.app[/\\]Contents[/\\]Resources([/\\]|$)/i.test(path);
}

/** Mirrors src/bun/runner.ts resolveBunEngine preference order. */
function resolveBunEngine(execPath) {
	if (looksLikeBunBinary(execPath) && isExecutableFile(execPath)) {
		return { path: execPath, source: "embedded-execPath" };
	}
	const execDir = dirname(execPath);
	const beside = [
		join(execDir, "bun"),
		join(execDir, "bun.exe"),
		join(execDir, "bin", "bun"),
		join(execDir, "bin", "bun.exe"),
		join(execDir, "..", "Resources", "bin", "bun"),
	];
	for (const candidate of beside) {
		if (candidate !== execPath && isExecutableFile(candidate)) {
			return { path: candidate, source: "embedded-beside-exec" };
		}
	}
	return { path: "bun", source: "path-fallback" };
}

const appArg = process.argv[2];
const appRoot = appArg
	? resolve(appArg)
	: resolve(
			__dirname,
			"build/dev-macos-arm64/CloneRunElectrobunPrototype-dev.app",
		);

const packagedExec = join(appRoot, "Contents/MacOS/bun");
const bogusBeside = join(appRoot, "Contents/Resources/app/bun");
const prototypeRoot = __dirname;
const wipFromSource = join(prototypeRoot, "WIP-PROTOTYPE-wipe-me");

let failed = 0;
function check(name, ok, detail = "") {
	const mark = ok ? "PASS" : "FAIL";
	if (!ok) failed++;
	console.log(`${mark}: ${name}${detail ? ` — ${detail}` : ""}`);
}

check("packaged MacOS/bun exists", existsSync(packagedExec), packagedExec);
check("packaged MacOS/bun is executable file", isExecutableFile(packagedExec));
check(
	"Resources/app/bun is NOT an executable file (it's the JS bundle dir)",
	existsSync(bogusBeside) && !isExecutableFile(bogusBeside),
	bogusBeside,
);

const engine = resolveBunEngine(packagedExec);
check(
	"resolveBunEngine prefers embedded-execPath",
	engine.source === "embedded-execPath",
	`${engine.source} → ${engine.path}`,
);
check(
	"chosen bunPath is executable",
	isExecutableFile(engine.path),
	engine.path,
);
check(
	"chosen bunPath is not Resources/app/bun",
	resolve(engine.path) !== resolve(bogusBeside),
);

check(
	"source WIP root is outside .app Resources",
	!isInsideAppResources(wipFromSource),
	wipFromSource,
);
check(
	"packaged Resources WIP would be rejected",
	isInsideAppResources(
		join(appRoot, "Contents/Resources/WIP-PROTOTYPE-wipe-me"),
	),
);

// Live spawn smoke: MacOS bun --version
if (isExecutableFile(packagedExec)) {
	const proc = Bun.spawn([packagedExec, "--version"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const out = await new Response(proc.stdout).text();
	const code = await proc.exited;
	check(
		"posix_spawn MacOS/bun --version",
		code === 0 && out.trim().length > 0,
		`exit=${code} version=${out.trim()}`,
	);
}

// Demonstrate old bug: spawning the directory fails
if (existsSync(bogusBeside) && !statSync(bogusBeside).isFile()) {
	try {
		const proc = Bun.spawn([bogusBeside, "--version"], {
			stdout: "pipe",
			stderr: "pipe",
		});
		await proc.exited;
		check("old path Resources/app/bun would spawn", false, "unexpectedly succeeded");
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		check(
			"old path Resources/app/bun still EACCES/spawn-fails (expected)",
			/EACCES|spawn|Executable/i.test(msg),
			msg.split("\n")[0],
		);
	}
}

if (failed > 0) {
	console.error(`\n${failed} check(s) failed`);
	process.exit(1);
}
console.log("\nAll smoke checks passed.");
