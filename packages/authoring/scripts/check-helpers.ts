/**
 * Shared ok/fail scaffolding for authoring check scripts.
 * Console output matches `check:allowlist` expectations.
 */

export type Failure = { label: string; detail: string };

export type CheckRecorder = {
	ok: (label: string) => void;
	fail: (label: string, detail: string) => void;
	/** Print results and exit 1 on failure. */
	finish: (opts: { title: string; passedLabel: string }) => void;
};

export function createCheckRecorder(): CheckRecorder {
	const failures: Failure[] = [];
	const passed: string[] = [];

	return {
		ok(label: string): void {
			passed.push(label);
		},
		fail(label: string, detail: string): void {
			failures.push({ label, detail });
		},
		finish({ title, passedLabel }): void {
			console.log(`--- ${title} ---`);
			for (const p of passed) console.log(`ok  ${p}`);
			for (const f of failures) console.error(`FAIL ${f.label}: ${f.detail}`);

			if (failures.length > 0) {
				process.exit(1);
			}
			console.log(`${passedLabel} (${passed.length} assertion(s))`);
		},
	};
}
