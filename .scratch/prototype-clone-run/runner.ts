/**
 * PROTOTYPE — impure runner (git / install / spawn). Throwaway shell.
 */

import { join } from "node:path";
import { existsSync } from "node:fs";
import type { PackageManager } from "./machine.ts";

export type ParsedGithub = {
	cloneUrl: string;
	subdirectory: string;
	branch: string;
};

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
		owner = treeMatch[1];
		repo = treeMatch[2].replace(/\.git$/, "");
		branch = treeMatch[3];
		if (!sub && treeMatch[4]) sub = treeMatch[4];
	} else if (repoMatch) {
		owner = repoMatch[1];
		repo = repoMatch[2].replace(/\.git$/, "");
	} else if (shortMatch) {
		owner = shortMatch[1];
		repo = shortMatch[2].replace(/\.git$/, "");
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

export function installCommand(pm: PackageManager): string[] {
	switch (pm) {
		case "bun":
			return ["bun", "install"];
		case "pnpm":
			return ["pnpm", "install"];
		case "yarn":
			return ["yarn", "install"];
		case "npm":
			return ["npm", "install"];
		case "deno":
			return ["deno", "install"];
	}
}

export function resolveDevCommand(dir: string, pm: PackageManager): string[] {
	const pkgPath = join(dir, "package.json");
	if (existsSync(pkgPath)) {
		const pkg = JSON.parse(Deno.readTextFileSync(pkgPath)) as {
			scripts?: Record<string, string>;
		};
		if (pkg.scripts?.dev) {
			switch (pm) {
				case "bun":
					return ["bun", "run", "dev"];
				case "pnpm":
					return ["pnpm", "dev"];
				case "yarn":
					return ["yarn", "dev"];
				case "npm":
					return ["npm", "run", "dev"];
				case "deno":
					return ["deno", "task", "dev"];
			}
		}
	}

	if (pm === "deno") {
		if (existsSync(join(dir, "main.ts"))) return ["deno", "run", "-A", "main.ts"];
		if (existsSync(join(dir, "dev.ts"))) return ["deno", "run", "-A", "dev.ts"];
	}

	throw new Error(`No "dev" script found in ${dir}`);
}

export function extractLocalUrl(chunk: string): string | null {
	const match = chunk.match(
		/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+[^\s"'<>]*/i,
	);
	if (!match) return null;
	return match[0]
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
	opts: { cwd: string; onLine?: (line: string, stream: "out" | "err") => void },
): Promise<RunResult> {
	const proc = new Deno.Command(cmd[0], {
		args: cmd.slice(1),
		cwd: opts.cwd,
		stdout: "piped",
		stderr: "piped",
	}).spawn();

	let stdout = "";
	let stderr = "";

	const read = async (
		stream: ReadableStream<Uint8Array>,
		kind: "out" | "err",
	) => {
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
	const status = await proc.status;
	return {
		success: status.success,
		code: status.code,
		stdout,
		stderr,
	};
}

export type LivingProcess = {
	kill: () => void;
	wait: Promise<Deno.CommandStatus>;
};

export function spawnLiving(
	cmd: string[],
	opts: {
		cwd: string;
		onChunk: (text: string) => void;
	},
): LivingProcess {
	const proc = new Deno.Command(cmd[0], {
		args: cmd.slice(1),
		cwd: opts.cwd,
		stdout: "piped",
		stderr: "piped",
	}).spawn();

	const pump = async (stream: ReadableStream<Uint8Array>) => {
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
				proc.kill("SIGTERM");
			} catch {
				/* already dead */
			}
		},
		wait: proc.status,
	};
}

export async function cloneRepo(
	parsed: ParsedGithub,
	dest: string,
	onLine: (line: string) => void,
): Promise<void> {
	await Deno.remove(dest, { recursive: true }).catch(() => {});
	await Deno.mkdir(join(dest, ".."), { recursive: true });

	const args = [
		"clone",
		"--depth",
		"1",
		"--branch",
		parsed.branch,
	];

	if (parsed.subdirectory) {
		args.push("--filter=blob:none", "--sparse", parsed.cloneUrl, dest);
	} else {
		args.push(parsed.cloneUrl, dest);
	}

	const clone = await runCaptured(["git", ...args], {
		cwd: Deno.cwd(),
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
	await Deno.remove(staging, { recursive: true }).catch(() => {});
	onLine(`flatten ${parsed.subdirectory} → standalone workdir (drop monorepo root)`);
	await Deno.rename(nested, staging);
	await Deno.remove(dest, { recursive: true });
	await Deno.rename(staging, dest);
}

/** Always the clone root — subdirectory clones are flattened into dest. */
export function workDirFor(cloneRoot: string, _subdirectory: string): string {
	return cloneRoot;
}

