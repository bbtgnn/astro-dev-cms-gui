/**
 * PROTOTYPE — impure runner (git / bun install / spawn). Throwaway shell.
 * Bun-first: install + dev always go through the resolved Bun engine.
 */

import {
	accessSync,
	constants,
	existsSync,
	mkdirSync,
	renameSync,
	rmSync,
	readFileSync,
	statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { PackageManager } from "../shared/machine.ts";

export type ParsedGithub = {
	cloneUrl: string;
	subdirectory: string;
	branch: string;
};

export type BunEngine = {
	path: string;
	source:
		| "embedded-beside-exec"
		| "embedded-execPath"
		| "path-which"
		| "path-fallback";
	systemNodePresent: boolean;
};

/** True for a regular file that is executable (dirs can pass X_OK alone on macOS). */
export function isExecutableFile(path: string): boolean {
	try {
		if (!statSync(path).isFile()) return false;
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

export function looksLikeBunBinary(path: string): boolean {
	const base = path.split(/[/\\]/).pop()?.toLowerCase() ?? "";
	return base === "bun" || base === "bun.exe" || base.includes("bun");
}

/** Packaged macOS app Resources (or sibling Contents paths) — not for WIP clones. */
export function isInsideAppResources(path: string): boolean {
	return /[/\\][^/\\]+\.app[/\\]Contents[/\\]Resources([/\\]|$)/i.test(path);
}

export function assertExecutableBun(path: string): void {
	if (!isExecutableFile(path)) {
		throw new Error(
			`Resolved bun is not an executable file (EACCES risk): ${path}`,
		);
	}
}

/** Accepts owner/repo or full github.com URLs, including /tree/<branch>/<subdir>. */
export function parseGithubInput(input: string, subdirectory = ""): ParsedGithub {
	const raw = input.trim();
	let owner = "";
	let repo = "";
	let branch = "main";
	let sub = subdirectory.trim();

	const treeMatch = raw.match(
		/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.*))?\/?$/,
	);
	const repoMatch = raw.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#]+)\/?$/);
	const shortMatch = raw.match(/^([^/\s]+)\/([^/\s]+)$/);

	if (treeMatch) {
		owner = treeMatch[1]!;
		repo = treeMatch[2]!.replace(/\.git$/, "");
		branch = treeMatch[3]!;
		if (!sub && treeMatch[4]) sub = treeMatch[4];
	} else if (repoMatch) {
		owner = repoMatch[1]!;
		repo = repoMatch[2]!.replace(/\.git$/, "");
	} else if (shortMatch) {
		owner = shortMatch[1]!;
		repo = shortMatch[2]!.replace(/\.git$/, "");
	} else {
		throw new Error(`Unrecognized GitHub input: ${input}`);
	}

	return {
		cloneUrl: `https://github.com/${owner}/${repo}.git`,
		subdirectory: sub,
		branch,
	};
}

export function detectPackageManager(dir: string): PackageManager {
	if (existsSync(join(dir, "bun.lockb")) || existsSync(join(dir, "bun.lock"))) {
		return "bun";
	}
	if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm";
	if (existsSync(join(dir, "yarn.lock"))) return "yarn";
	if (existsSync(join(dir, "package-lock.json"))) return "npm";
	if (existsSync(join(dir, "deno.json")) || existsSync(join(dir, "deno.jsonc"))) {
		return "deno";
	}
	if (existsSync(join(dir, "package.json"))) return "npm";
	throw new Error(`No package manager clues in ${dir}`);
}

/**
 * Spike always installs/runs with Bun — lockfile PM is informational only.
 *
 * Prefer process.execPath when it is already the working Electrobun MacOS bun.
 * Do NOT prefer Resources/app/bun: that path is Electrobun's JS bundle directory
 * (contains index.js), not a CLI binary — existsSync alone caused EACCES posix_spawn.
 */
export function resolveBunEngine(): BunEngine {
	const systemNodePresent = Boolean(Bun.which("node") || Bun.which("npm"));
	const execPath = process.execPath;

	// Electrobun main process is Contents/MacOS/bun — spawn that for install/dev.
	if (looksLikeBunBinary(execPath) && isExecutableFile(execPath)) {
		return { path: execPath, source: "embedded-execPath", systemNodePresent };
	}

	const execDir = dirname(execPath);
	// Sibling CLIs only — skip Resources/app/bun (name collision with JS entry dir).
	const beside = [
		join(execDir, "bun"),
		join(execDir, "bun.exe"),
		join(execDir, "bin", "bun"),
		join(execDir, "bin", "bun.exe"),
		join(execDir, "..", "Resources", "bin", "bun"),
	];

	for (const candidate of beside) {
		if (candidate !== execPath && isExecutableFile(candidate)) {
			return {
				path: candidate,
				source: "embedded-beside-exec",
				systemNodePresent,
			};
		}
	}

	const which = Bun.which("bun");
	if (which && isExecutableFile(which)) {
		return { path: which, source: "path-which", systemNodePresent };
	}

	return { path: "bun", source: "path-fallback", systemNodePresent };
}

export function bunInstallCommand(engine: BunEngine): string[] {
	return [engine.path, "install"];
}

export function bunDevCommand(engine: BunEngine, dir: string): string[] {
	const pkgPath = join(dir, "package.json");
	if (!existsSync(pkgPath)) {
		throw new Error(`No package.json in ${dir}`);
	}
	const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
		scripts?: Record<string, string>;
	};
	if (!pkg.scripts?.dev) {
		throw new Error(`No "dev" script found in ${dir}`);
	}
	return [engine.path, "run", "dev"];
}

export function extractLocalUrl(chunk: string): string | null {
	const match = chunk.match(
		/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+[^\s"'<>]*/i,
	);
	if (!match) return null;
	return match[0]!
		.replace("0.0.0.0", "127.0.0.1")
		.replace(/[),.;]+$/, "");
}

export type RunResult = {
	success: boolean;
	code: number | null;
	stdout: string;
	stderr: string;
};

export async function runCaptured(
	cmd: string[],
	opts: {
		cwd: string;
		env?: Record<string, string>;
		onLine?: (line: string, stream: "out" | "err") => void;
	},
): Promise<RunResult> {
	if (cmd[0] && (cmd[0].includes("/") || cmd[0].includes("\\"))) {
		assertExecutableBun(cmd[0]);
	}
	const proc = Bun.spawn(cmd, {
		cwd: opts.cwd,
		env: { ...process.env, ...opts.env },
		stdout: "pipe",
		stderr: "pipe",
	});

	let stdout = "";
	let stderr = "";

	const read = async (
		stream: ReadableStream<Uint8Array> | null,
		kind: "out" | "err",
	) => {
		if (!stream) return;
		const reader = stream.getReader();
		const dec = new TextDecoder();
		let buf = "";
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			const text = dec.decode(value, { stream: true });
			if (kind === "out") stdout += text;
			else stderr += text;
			buf += text;
			const parts = buf.split(/\r?\n/);
			buf = parts.pop() ?? "";
			for (const line of parts) {
				if (line.trim()) opts.onLine?.(line, kind);
			}
		}
		if (buf.trim()) opts.onLine?.(buf, kind);
	};

	await Promise.all([read(proc.stdout, "out"), read(proc.stderr, "err")]);
	const code = await proc.exited;
	return {
		success: code === 0,
		code,
		stdout,
		stderr,
	};
}

export type LivingProcess = {
	kill: () => void;
	wait: Promise<number>;
};

export function spawnLiving(
	cmd: string[],
	opts: {
		cwd: string;
		env?: Record<string, string>;
		onChunk: (text: string) => void;
	},
): LivingProcess {
	if (cmd[0] && (cmd[0].includes("/") || cmd[0].includes("\\"))) {
		assertExecutableBun(cmd[0]);
	}
	const proc = Bun.spawn(cmd, {
		cwd: opts.cwd,
		env: { ...process.env, ...opts.env },
		stdout: "pipe",
		stderr: "pipe",
	});

	const pump = async (stream: ReadableStream<Uint8Array> | null) => {
		if (!stream) return;
		const reader = stream.getReader();
		const dec = new TextDecoder();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			opts.onChunk(dec.decode(value, { stream: true }));
		}
	};

	void pump(proc.stdout);
	void pump(proc.stderr);

	return {
		kill: () => {
			try {
				proc.kill();
			} catch {
				/* already dead */
			}
		},
		wait: proc.exited,
	};
}

export async function cloneRepo(
	parsed: ParsedGithub,
	dest: string,
	onLine: (line: string) => void,
): Promise<void> {
	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dirname(dest), { recursive: true });

	const args = ["clone", "--depth", "1", "--branch", parsed.branch];

	if (parsed.subdirectory) {
		args.push("--filter=blob:none", "--sparse", parsed.cloneUrl, dest);
	} else {
		args.push(parsed.cloneUrl, dest);
	}

	const clone = await runCaptured(["git", ...args], {
		cwd: process.cwd(),
		onLine: (line) => onLine(line),
	});
	if (!clone.success) {
		throw new Error(clone.stderr || clone.stdout || `git clone failed (${clone.code})`);
	}

	if (!parsed.subdirectory) return;

	const sparse = await runCaptured(
		["git", "sparse-checkout", "set", "--cone", parsed.subdirectory],
		{ cwd: dest, onLine },
	);
	if (!sparse.success) {
		throw new Error(sparse.stderr || "sparse-checkout failed");
	}

	// Cone sparse-checkout still keeps monorepo root files (tsconfig, lockfiles).
	// Vite/tsc walk up and hit broken extends like configs/tsconfig.base.json.
	// Flatten the subdirectory into dest so the app is a standalone tree.
	const nested = join(dest, parsed.subdirectory);
	const staging = `${dest}.flat-staging`;
	rmSync(staging, { recursive: true, force: true });
	onLine(`flatten ${parsed.subdirectory} → standalone workdir (drop monorepo root)`);
	renameSync(nested, staging);
	rmSync(dest, { recursive: true, force: true });
	renameSync(staging, dest);
}

/** Always the clone root — subdirectory clones are flattened into dest. */
export function workDirFor(cloneRoot: string, _subdirectory: string): string {
	return cloneRoot;
}
