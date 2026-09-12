/**
 * PROTOTYPE / THROWAWAY — Electrobun (Bun main process) control shell.
 *
 * Assumption: orchestration/logic prototype (not UI variants). Answers:
 * "Can Electrobun + embedded Bun clone → install → run → webview, and
 * live-eval Zod schemas from content.config — better consumer shape than Deno Desktop?"
 *
 * Run: bun run prototype:clone-run-electrobun
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserView, BrowserWindow, Utils } from "electrobun/main";
import {
	canStart,
	canStop,
	initialState,
	reduce,
	type Action,
	type SessionState,
} from "../shared/machine.ts";
import type { AppRPC } from "../shared/rpc.ts";
import {
	bunDevCommand,
	bunInstallCommand,
	cloneRepo,
	detectPackageManager,
	extractLocalUrl,
	isInsideAppResources,
	parseGithubInput,
	resolveBunEngine,
	runCaptured,
	spawnLiving,
	workDirFor,
	type LivingProcess,
} from "./runner.ts";

/** Packaged asset root (import.meta may live under Resources/app/bun/). */
const HERE = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * WIP clones must be writable and outside *.app/Contents/Resources.
 * Prefer prototype source tree in dev; fall back to Utils.paths.userData.
 */
export function resolveWipRoot(): string {
	const override = process.env.PROTOTYPE_WIP_ROOT?.trim();
	if (override) {
		if (isInsideAppResources(override)) {
			throw new Error(
				`PROTOTYPE_WIP_ROOT must not be inside .app Resources: ${override}`,
			);
		}
		return override;
	}

	const candidates = [
		process.cwd(),
		join(process.cwd(), ".scratch/prototype-clone-run-electrobun"),
		HERE,
	];

	for (const root of candidates) {
		if (
			existsSync(join(root, "electrobun.config.ts")) &&
			!isInsideAppResources(root)
		) {
			return join(root, "WIP-PROTOTYPE-wipe-me");
		}
	}

	const userData = Utils.paths.userData;
	if (!userData || isInsideAppResources(userData)) {
		throw new Error(
			`No writable WIP root (userData unusable): ${userData ?? "(empty)"}`,
		);
	}
	return join(userData, "WIP-PROTOTYPE-wipe-me");
}

const WIP_ROOT = resolveWipRoot();
const CLONE_DIR = join(WIP_ROOT, "repo");
const DEFAULT_REPO =
	"https://github.com/withastro/astro/tree/main/examples/blog";

if (isInsideAppResources(WIP_ROOT)) {
	throw new Error(`WIP root landed inside .app Resources: ${WIP_ROOT}`);
}

let state: SessionState = initialState();
let living: LivingProcess | null = null;
let runToken = 0;
let previewWin: BrowserWindow | null = null;

function snapshot(s: SessionState) {
	return {
		...s,
		canStart: canStart(s),
		canStop: canStop(s),
	};
}

function dispatch(action: Action): SessionState {
	state = reduce(state, action);
	console.log(`[state] ${state.phase}`, {
		repoUrl: state.repoUrl,
		packageManager: state.packageManager,
		bunSource: state.bunSource,
		previewUrl: state.previewUrl,
		error: state.error,
		lastChanged: state.lastChanged,
	});
	return state;
}

function stopLiving() {
	living?.kill();
	living = null;
}

function openPreview(url: string) {
	if (!previewWin) {
		previewWin = new BrowserWindow({
			title: `Preview — ${url}`,
			url,
			frame: { width: 1100, height: 760, x: 80, y: 60 },
		});
		return;
	}
	try {
		previewWin.setTitle(`Preview — ${url}`);
	} catch {
		/* title API may vary by Electrobun build */
	}
	previewWin.webview.loadURL(url);
}

function findInspectScript(): string {
	const candidates = [
		join(HERE, "inspect-content-config.mjs"),
		join(process.cwd(), "inspect-content-config.mjs"),
		join(process.cwd(), "../Resources/inspect-content-config.mjs"),
		join(dirname(process.execPath), "../Resources/inspect-content-config.mjs"),
		join(dirname(process.execPath), "../Resources/app/inspect-content-config.mjs"),
	];
	for (const c of candidates) {
		if (existsSync(c)) return c;
	}
	throw new Error("inspect-content-config.mjs not found");
}

async function runPipeline(repoUrl: string, subdirectory = "") {
	const token = ++runToken;
	stopLiving();
	dispatch({ type: "start", repoUrl, subdirectory });

	try {
		const engine = resolveBunEngine();
		dispatch({
			type: "engine",
			bunPath: engine.path,
			bunSource: engine.source,
			systemNodePresent: engine.systemNodePresent,
		});
		dispatch({
			type: "log",
			line: `bun engine: ${engine.source} → ${engine.path} (system node/npm: ${
				engine.systemNodePresent ? "present" : "absent"
			})`,
		});

		const parsed = parseGithubInput(repoUrl, subdirectory);
		dispatch({
			type: "log",
			line: `clone ${parsed.cloneUrl} @ ${parsed.branch}${
				parsed.subdirectory ? ` / ${parsed.subdirectory}` : ""
			}`,
		});

		await cloneRepo(parsed, CLONE_DIR, (line) => {
			if (token !== runToken) return;
			dispatch({ type: "log", line });
		});
		if (token !== runToken) return;

		const dir = workDirFor(CLONE_DIR, parsed.subdirectory);
		dispatch({ type: "phase", phase: "detecting" });
		const pm = detectPackageManager(dir);
		const devCmd = bunDevCommand(engine, dir);
		dispatch({
			type: "detected",
			packageManager: pm,
			workDir: dir,
			devCommand: devCmd.join(" "),
		});
		dispatch({
			type: "log",
			line: `lockfile PM=${pm}; forcing install/run via Bun (${engine.source})`,
		});

		dispatch({ type: "log", line: `install via ${devCmd[0]} install` });
		const install = await runCaptured(bunInstallCommand(engine), {
			cwd: dir,
			onLine: (line) => {
				if (token !== runToken) return;
				dispatch({ type: "log", line });
			},
		});
		if (token !== runToken) return;
		if (!install.success) {
			throw new Error(install.stderr || install.stdout || "bun install failed");
		}

		dispatch({ type: "phase", phase: "starting" });
		dispatch({ type: "log", line: `spawn ${devCmd.join(" ")}` });
		dispatch({ type: "phase", phase: "waiting_for_url" });

		let found: string | null = null;
		living = spawnLiving(devCmd, {
			cwd: dir,
			onChunk: (text) => {
				if (token !== runToken) return;
				for (const line of text.split(/\r?\n/)) {
					if (line.trim()) dispatch({ type: "log", line });
				}
				const url = extractLocalUrl(text);
				if (url && !found) {
					found = url;
					dispatch({ type: "preview_url", url });
					openPreview(url);
				}
			},
		});

		void living.wait.then((code) => {
			if (token !== runToken) return;
			if (state.phase === "previewing" || state.phase === "waiting_for_url") {
				dispatch({
					type: "fail",
					error: `dev process exited (${code})`,
				});
			}
		});
	} catch (err) {
		if (token !== runToken) return;
		stopLiving();
		dispatch({
			type: "fail",
			error: err instanceof Error ? err.message : String(err),
		});
	}
}

const rpc = BrowserView.defineRPC<AppRPC>({
	maxRequestTime: 120_000,
	handlers: {
		requests: {
			pollState: () => snapshot(state),
			start: ({ repoUrl, subdirectory }) => {
				void runPipeline(repoUrl, subdirectory ?? "");
				return snapshot(state);
			},
			stop: () => {
				runToken++;
				stopLiving();
				return snapshot(dispatch({ type: "stop" }));
			},
			reset: () => {
				runToken++;
				stopLiving();
				return snapshot(dispatch({ type: "reset" }));
			},
			reopenPreview: () => {
				if (state.previewUrl) openPreview(state.previewUrl);
				return snapshot(state);
			},
			copyLogs: async () => {
				const text = state.logTail.join("\n");
				const proc = Bun.spawn(["pbcopy"], {
					stdin: new TextEncoder().encode(text),
					stdout: "ignore",
					stderr: "ignore",
				});
				const code = await proc.exited;
				if (code !== 0) throw new Error(`pbcopy exited ${code}`);
				return { ok: true, lines: state.logTail.length, bytes: text.length };
			},
			inspectSchemas: async () => {
				if (!state.workDir) throw new Error("No workDir — run the pipeline first");
				const script = findInspectScript();
				const engine = resolveBunEngine();
				dispatch({
					type: "log",
					line: `inspect schemas via ${engine.path} ${script}`,
				});
				const result = await runCaptured(
					[engine.path, script, state.workDir],
					{
						cwd: state.workDir,
						onLine: (line) => dispatch({ type: "log", line }),
					},
				);
				const raw = (result.stdout || result.stderr || "").trim();
				try {
					return JSON.parse(raw);
				} catch {
					return {
						ok: false,
						error: raw || `inspect exited ${result.code}`,
					};
				}
			},
		},
		messages: {},
	},
});

mkdirSync(WIP_ROOT, { recursive: true });

const controlWin = new BrowserWindow({
	title: "Clone→Run prototype (Electrobun / Bun)",
	url: "views://mainview/index.html",
	frame: { width: 920, height: 820, x: 120, y: 40 },
	rpc,
});

previewWin = new BrowserWindow({
	title: "Preview (waiting…)",
	url: "views://preview/waiting.html",
	frame: { width: 1100, height: 760, x: 80, y: 60 },
});

console.log("PROTOTYPE ready — Electrobun Bun main + control/preview webviews.");
console.log(`Default repo: ${DEFAULT_REPO}`);
console.log(`WIP root: ${WIP_ROOT}`);
console.log(`execPath: ${process.execPath}`);
void controlWin;
