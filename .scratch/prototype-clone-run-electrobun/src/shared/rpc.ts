import type { SessionState } from "./machine.ts";

export type StateSnapshot = SessionState & {
	canStart: boolean;
	canStop: boolean;
};

/** Shared RPC contract — types only; no electrobun runtime import. */
export type AppRPC = {
	bun: {
		requests: {
			pollState: {
				params: Record<string, never>;
				response: StateSnapshot;
			};
			start: {
				params: { repoUrl: string; subdirectory?: string };
				response: StateSnapshot;
			};
			stop: {
				params: Record<string, never>;
				response: StateSnapshot;
			};
			reset: {
				params: Record<string, never>;
				response: StateSnapshot;
			};
			reopenPreview: {
				params: Record<string, never>;
				response: StateSnapshot;
			};
			inspectSchemas: {
				params: Record<string, never>;
				response: unknown;
			};
			copyLogs: {
				params: Record<string, never>;
				response: { ok: boolean; lines: number; bytes: number };
			};
		};
		messages: Record<string, never>;
	};
	webview: {
		requests: Record<string, never>;
		messages: Record<string, never>;
	};
};
