/**
 * PROTOTYPE — liftable state machine (no DOM, no Electrobun APIs).
 *
 * Question: can Electrobun (Bun main process) clone → bun install → bun run
 * → native webview preview, and live-eval Zod schemas from content.config?
 */

export type Phase =
	| "idle"
	| "cloning"
	| "detecting"
	| "installing"
	| "starting"
	| "waiting_for_url"
	| "previewing"
	| "failed"
	| "stopped";

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm" | "deno";

export type SessionState = {
	phase: Phase;
	repoUrl: string;
	subdirectory: string;
	workDir: string;
	packageManager: PackageManager | null;
	devCommand: string | null;
	previewUrl: string | null;
	bunPath: string | null;
	bunSource: string | null;
	systemNodePresent: boolean | null;
	lastChanged: string | null;
	logTail: string[];
	error: string | null;
};

export type Action =
	| { type: "reset" }
	| { type: "start"; repoUrl: string; subdirectory?: string }
	| { type: "phase"; phase: Phase }
	| {
			type: "detected";
			packageManager: PackageManager;
			workDir: string;
			devCommand: string;
	  }
	| {
			type: "engine";
			bunPath: string;
			bunSource: string;
			systemNodePresent: boolean;
	  }
	| { type: "preview_url"; url: string }
	| { type: "log"; line: string }
	| { type: "fail"; error: string }
	| { type: "stop" };

const MAX_LOG = 40;

export function initialState(): SessionState {
	return {
		phase: "idle",
		repoUrl: "",
		subdirectory: "",
		workDir: "",
		packageManager: null,
		devCommand: null,
		previewUrl: null,
		bunPath: null,
		bunSource: null,
		systemNodePresent: null,
		lastChanged: null,
		logTail: [],
		error: null,
	};
}

function touch(state: SessionState, fields: string[]): SessionState {
	return { ...state, lastChanged: fields.join(", ") };
}

export function reduce(state: SessionState, action: Action): SessionState {
	switch (action.type) {
		case "reset":
			return touch(initialState(), ["phase", "repoUrl", "error", "previewUrl"]);

		case "start":
			return touch(
				{
					...initialState(),
					phase: "cloning",
					repoUrl: action.repoUrl.trim(),
					subdirectory: (action.subdirectory ?? "").trim(),
				},
				["phase", "repoUrl", "subdirectory"],
			);

		case "phase":
			return touch({ ...state, phase: action.phase, error: null }, ["phase"]);

		case "detected":
			return touch(
				{
					...state,
					phase: "installing",
					packageManager: action.packageManager,
					workDir: action.workDir,
					devCommand: action.devCommand,
					error: null,
				},
				["phase", "packageManager", "workDir", "devCommand"],
			);

		case "engine":
			return touch(
				{
					...state,
					bunPath: action.bunPath,
					bunSource: action.bunSource,
					systemNodePresent: action.systemNodePresent,
				},
				["bunPath", "bunSource", "systemNodePresent"],
			);

		case "preview_url":
			return touch(
				{
					...state,
					phase: "previewing",
					previewUrl: action.url,
					error: null,
				},
				["phase", "previewUrl"],
			);

		case "log": {
			const logTail = [...state.logTail, action.line].slice(-MAX_LOG);
			return touch({ ...state, logTail }, ["logTail"]);
		}

		case "fail":
			return touch(
				{ ...state, phase: "failed", error: action.error },
				["phase", "error"],
			);

		case "stop":
			return touch(
				{
					...state,
					phase: state.phase === "idle" ? "idle" : "stopped",
					error: null,
				},
				["phase"],
			);

		default:
			return state;
	}
}

export function canStart(state: SessionState): boolean {
	return (
		state.phase === "idle" ||
		state.phase === "failed" ||
		state.phase === "stopped" ||
		state.phase === "previewing"
	);
}

export function canStop(state: SessionState): boolean {
	return (
		state.phase !== "idle" &&
		state.phase !== "stopped" &&
		state.phase !== "failed"
	);
}
