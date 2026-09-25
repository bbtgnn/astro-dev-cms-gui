/**
 * Fake protocol client + deterministic timers — no pass/fail recording.
 */

import type { ContentEntry } from "@cms/core/fetch-client";

export const sampleEntry: ContentEntry = {
	id: "hello",
	collection: "posts",
	data: { title: "Hello" },
	revision: "rev-1",
};

export function createFakeTimers() {
	let nextId = 1;
	const pending = new Map<number, { fn: () => void; at: number }>();
	let now = 0;

	return {
		now: () => now,
		advance(ms: number) {
			now += ms;
			const due = [...pending.entries()]
				.filter(([, t]) => t.at <= now)
				.sort((a, b) => a[1].at - b[1].at);
			for (const [id, t] of due) {
				pending.delete(id);
				t.fn();
			}
		},
		timers: {
			setTimer(fn: () => void, ms: number) {
				const id = nextId++;
				pending.set(id, { fn, at: now + ms });
				return id;
			},
			clearTimer(id: unknown) {
				pending.delete(id as number);
			},
		},
	};
}

export async function waitUntil(
	pred: () => boolean,
	label: string,
	attempts = 50,
): Promise<void> {
	for (let i = 0; i < attempts; i++) {
		if (pred()) return;
		await Promise.resolve();
		await new Promise((r) => setTimeout(r, 0));
	}
	throw new Error(`timed out waiting: ${label}`);
}
