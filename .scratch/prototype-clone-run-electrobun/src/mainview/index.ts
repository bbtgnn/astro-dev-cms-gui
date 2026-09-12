import { Electroview } from "electrobun/view";
import type { AppRPC, StateSnapshot } from "../shared/rpc.ts";

const DEFAULT_REPO =
	"https://github.com/withastro/astro/tree/main/examples/blog";

type Snapshot = StateSnapshot;

type RpcClient = ReturnType<typeof Electroview.defineRPC<AppRPC>>;

const scenarios = [
	{
		id: "happy",
		name: "Happy path",
		blurb:
			"Clone Astro's blog example (Zod content collections), flatten the monorepo subdir, bun install via resolved Bun engine, start dev, open native webview preview.",
		steps: [
			{
				label: "1. Start pipeline (Astro blog + Zod collections)",
				action: "startDefault",
			},
			{ label: "2. Re-open preview window", action: "reopen", needsUrl: true },
		],
	},
	{
		id: "bad",
		name: "Bad URL",
		blurb:
			"Start with nonsense input. State should land in failed with a readable error — not hang.",
		steps: [
			{ label: "1. Start with invalid input", action: "startBad" },
			{ label: "2. Reset to idle", action: "reset" },
		],
	},
	{
		id: "stop",
		name: "Stop mid-flight",
		blurb:
			"Kick off the happy path, then stop before preview. Confirms teardown of the child process.",
		steps: [
			{ label: "1. Start pipeline", action: "startDefault" },
			{ label: "2. Stop", action: "stop" },
			{ label: "3. Reset", action: "reset" },
		],
	},
] as const;

let active: (typeof scenarios)[number]["id"] = "happy";
let stepIndex = 0;
let state: Snapshot | null = null;
let rpc: RpcClient | null = null;
let rpcReady = false;

const repoInput = document.getElementById("repo") as HTMLInputElement;
repoInput.value = DEFAULT_REPO;

function showRpcError(msg: string) {
	const el = document.getElementById("rpc-error")!;
	el.hidden = false;
	el.textContent = msg;
}

function clearRpcError() {
	const el = document.getElementById("rpc-error")!;
	el.hidden = true;
	el.textContent = "";
}

function escapeHtml(t: string) {
	return String(t).replace(
		/[&<>"']/g,
		(c) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			})[c]!,
	);
}

function renderState(s: Snapshot) {
	state = s;
	const fields: [string, string][] = [
		["phase", s.phase],
		["repoUrl", s.repoUrl || "—"],
		["subdirectory", s.subdirectory || "—"],
		["packageManager", s.packageManager || "—"],
		["bunSource", s.bunSource || "—"],
		["bunPath", s.bunPath || "—"],
		[
			"systemNode",
			s.systemNodePresent == null
				? "—"
				: s.systemNodePresent
					? "present (not required for happy path)"
					: "absent",
		],
		["devCommand", s.devCommand || "—"],
		["workDir", s.workDir || "—"],
		["previewUrl", s.previewUrl || "—"],
		["error", s.error || "—"],
	];
	document.getElementById("state")!.innerHTML = fields
		.map(
			([k, v]) =>
				`<div class="k">${k}</div><div class="v${
					k === "error" && s.error ? " fail" : ""
				}">${escapeHtml(v)}</div>`,
		)
		.join("");
	document.getElementById("changed")!.textContent = s.lastChanged
		? `Just changed: ${s.lastChanged}`
		: "";
	document.getElementById("log")!.textContent =
		(s.logTail || []).join("\n") || "(empty)";
	(document.getElementById("btn-start") as HTMLButtonElement).disabled =
		!s.canStart;
	(document.getElementById("btn-stop") as HTMLButtonElement).disabled =
		!s.canStop;
	(document.getElementById("btn-reopen") as HTMLButtonElement).disabled =
		!s.previewUrl;
	(document.getElementById("btn-schemas") as HTMLButtonElement).disabled =
		!s.workDir;
	renderScenario();
}

function renderTabs() {
	document.getElementById("tabs")!.innerHTML = scenarios
		.map(
			(sc) =>
				`<button class="tab${sc.id === active ? " active" : ""}" data-id="${
					sc.id
				}" type="button">${sc.name}</button>`,
		)
		.join("");
}

function renderScenario() {
	const sc = scenarios.find((s) => s.id === active)!;
	const steps = sc.steps
		.map((st, i) => {
			const done = i < stepIndex;
			const current = i === stepIndex;
			const disabled =
				!current ||
				("needsUrl" in st && st.needsUrl && !(state && state.previewUrl));
			return `<button data-step="${i}" type="button"${
				disabled ? " disabled" : ""
			}>${done ? "✓ " : ""}${st.label}</button>`;
		})
		.join("");
	document.getElementById("scenario")!.innerHTML =
		`<p>${sc.blurb}</p><div class="steps">${steps}</div>`;
}

function requireRpc(): RpcClient {
	if (!rpc || !rpcReady) {
		throw new Error("RPC not ready — Electroview failed to initialize");
	}
	return rpc;
}

async function runAction(name: string) {
	const client = requireRpc();
	if (name === "startDefault") {
		await client.request.start({ repoUrl: DEFAULT_REPO, subdirectory: "" });
	} else if (name === "startBad") {
		await client.request.start({
			repoUrl: "not-a-github-url",
			subdirectory: "",
		});
	} else if (name === "stop") {
		await client.request.stop({});
	} else if (name === "reset") {
		await client.request.reset({});
	} else if (name === "reopen") {
		await client.request.reopenPreview({});
	}
}

async function pollOnce() {
	if (!rpc || !rpcReady) return;
	try {
		const snap = await rpc.request.pollState({});
		clearRpcError();
		renderState(snap);
	} catch (err) {
		showRpcError(
			`pollState failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

// Paint walkthrough chrome + log placeholder immediately, before RPC.
renderTabs();
renderScenario();
document.getElementById("log")!.textContent = "(waiting for RPC…)";
document.getElementById("state")!.innerHTML =
	`<div class="k">phase</div><div class="v">connecting…</div>`;

try {
	rpc = Electroview.defineRPC<AppRPC>({
		maxRequestTime: 120_000,
		handlers: {
			requests: {},
			messages: {},
		},
	});
	new Electroview({ rpc });
	rpcReady = true;
} catch (err) {
	showRpcError(
		`Electroview failed: ${err instanceof Error ? err.message : String(err)}. Walkthrough chrome still works; live state/logs unavailable.`,
	);
	document.getElementById("log")!.textContent =
		"(RPC unavailable — Electroview init failed)";
}

document.getElementById("tabs")!.addEventListener("click", async (e) => {
	const id = (e.target as HTMLElement).dataset?.id as
		| typeof active
		| undefined;
	if (!id) return;
	active = id;
	stepIndex = 0;
	try {
		await requireRpc().request.reset({});
	} catch (err) {
		showRpcError(
			`reset failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
	renderTabs();
	renderScenario();
});

document.getElementById("scenario")!.addEventListener("click", async (e) => {
	const i = (e.target as HTMLElement).dataset?.step;
	if (i == null) return;
	const sc = scenarios.find((s) => s.id === active)!;
	try {
		await runAction(sc.steps[Number(i)]!.action);
		stepIndex = Math.min(stepIndex + 1, sc.steps.length);
		renderScenario();
	} catch (err) {
		showRpcError(
			`step failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
});

document.getElementById("btn-start")!.onclick = async () => {
	try {
		await requireRpc().request.start({
			repoUrl: repoInput.value,
			subdirectory: (document.getElementById("subdir") as HTMLInputElement)
				.value,
		});
	} catch (err) {
		showRpcError(
			`start failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
};
document.getElementById("btn-stop")!.onclick = async () => {
	try {
		await requireRpc().request.stop({});
	} catch (err) {
		showRpcError(
			`stop failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
};
document.getElementById("btn-reset")!.onclick = async () => {
	try {
		await requireRpc().request.reset({});
	} catch (err) {
		showRpcError(
			`reset failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
};
document.getElementById("btn-reopen")!.onclick = async () => {
	try {
		await requireRpc().request.reopenPreview({});
	} catch (err) {
		showRpcError(
			`reopen failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
};
document.getElementById("btn-schemas")!.onclick = async () => {
	const out = document.getElementById("schema-out")!;
	out.style.display = "block";
	out.textContent = "Loading content.config via Vite…";
	try {
		const result = await requireRpc().request.inspectSchemas({});
		out.textContent =
			typeof result === "string" ? result : JSON.stringify(result, null, 2);
	} catch (err) {
		out.textContent = `Failed: ${
			err instanceof Error ? err.message : String(err)
		}`;
	}
};
document.getElementById("btn-copy-logs")!.onclick = async () => {
	const status = document.getElementById("copy-status")!;
	try {
		const result = await requireRpc().request.copyLogs({});
		status.textContent = `Copied ${result.lines} lines`;
	} catch (err) {
		try {
			const text =
				state?.logTail?.length && state.logTail.length > 0
					? state.logTail.join("\n")
					: document.getElementById("log")!.textContent || "";
			await navigator.clipboard.writeText(text === "(empty)" ? "" : text);
			status.textContent = "Copied via clipboard API";
		} catch {
			status.textContent = `Copy failed: ${
				err instanceof Error ? err.message : String(err)
			}`;
		}
	}
	setTimeout(() => {
		status.textContent = "";
	}, 2000);
};

void pollOnce();
setInterval(() => {
	void pollOnce();
}, 350);
